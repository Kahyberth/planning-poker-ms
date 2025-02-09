import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { PokerWsService } from './poker-ws.service';
import { Socket } from 'socket.io';
import { Server } from 'socket.io';
import * as md5 from 'md5';
import { envs } from 'src/commons/envs';
import { Chat } from '../commons/interfaces/ChatData';

@WebSocketGateway({
  cors: {
    origin: envs.ORIGIN_CORS,
    credentials: true,
  },
})
export class PokerWsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() wss: Server;
  constructor(private readonly pokerWsService: PokerWsService) {}

  participants_in_room = new Map<string, Map<string, object>>();
  private votes = new Map<
    string,
    Map<string, { value: string; participant: any }>
  >();

  private stories = [];

  private currentStoryIndex = 0;

  private avarageValue = 0;

  private results = {
    average: 0,
    median: 0,
    mode: 0,
  };

  private historyByRoom = new Map<string, any[]>();

  private timers = new Map<
    string,
    { timeLeft: number; interval: NodeJS.Timeout }
  >();

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    const room = client.data.room;
    const participant = client.data.participant;

    if (room && participant) {
      const participantsMap = this.participants_in_room.get(room);
      if (participantsMap) {
        // Se elimina usando el user.id en lugar del client.id
        participantsMap.delete(participant.id);
        if (participantsMap.size === 0) {
          this.participants_in_room.delete(room);
        }
        this.emitParticipantList(room);
      }
    }
  }

  /**
   * @description  Join room and emit success message to client
   * @param client
   * @param room
   * @returns  void
   */
  @SubscribeMessage('join-room')
  async handleJoinRoom(client: Socket, room: string) {
    if (!room) {
      client.emit('error', { value: 'Missing room' });
      return;
    }

    this.stories = await this.pokerWsService.requestDeck(room);

    if (!this.stories || this.stories.length === 0) {
      client.emit('error', { value: 'No stories available' });
      return;
    }

    if (this.historyByRoom.has(room)) {
      const history = this.historyByRoom.get(room);
      client.emit('voting-history-updated', history);
    }

    if (this.timers.has(room)) {
      const timer = this.timers.get(room);
      client.emit('timer-started', { duration: timer.timeLeft });
    }

    client.emit('story-changed', {
      story: this.stories[this.currentStoryIndex],
      isLast: this.currentStoryIndex === this.stories.length - 1,
    });

    try {
      const user = client.handshake.auth.user_data;

      const participant_data = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: `https://www.gravatar.com/avatar/${md5(user.email.trim().toLowerCase())}?s=200&d=identicon`,
        role: user.role,
      };

      if (!this.participants_in_room.has(room)) {
        this.participants_in_room.set(room, new Map<string, object>());
      }

      const participantsMap = this.participants_in_room.get(room);

      participantsMap.set(user.id, participant_data);

      client.data.participant = participant_data;
      client.data.room = room;
      client.join(room);
      client.emit('success', { value: 'Joined room successfully' });
      this.emitParticipantList(room);

      if (this.votes.has(room) && this.votes.get(room).size > 0) {
        this.emitVoteUpdate(room);
      }
    } catch (error) {
      client.emit('error', { value: 'Token verification failed' });
      console.log('error', error);
    }
  }

  /**
   * @description  Leave room and emit success message to client
   * @param room
   * @returns  void
   */
  private emitParticipantList(room: string) {
    const participantsMap = this.participants_in_room.get(room);
    if (participantsMap) {
      const participantsArray = Array.from(participantsMap.values());
      this.wss.to(room).emit('participant-list', participantsArray);
    }
  }

  /**
   * @description  Leave room and emit success message to client
   * @param client
   * @param room
   * @returns  void
   */
  @SubscribeMessage('leave-room')
  handleLeaveRoom(client: Socket, room: string) {
    client.leave(room);
    this.pokerWsService.leaveSession(room, client.data.participant.id);
  }

  /**
   * @description  Send message to room
   * @param client
   * @param payload
   * @returns  void
   */
  @SubscribeMessage('send-message')
  onMessageReceived(client: Socket, payload: Chat) {
    const { message, room } = payload;
    client.to(room).emit('message', {
      message,
      sender: client.data.participant,
    });
  }

  /**
   * @description  Start timer
   * @param client
   * @param payload
   * @returns  void
   * */
  @SubscribeMessage('start-timer')
  handleStartTimer(
    client: Socket,
    payload: { room: string; duration: number },
  ) {
    const { room, duration } = payload;

    if (this.timers.has(room)) {
      clearInterval(this.timers.get(room).interval);
    }

    let timeLeft = duration;
    const updateInterval = 1000;

    const interval = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(interval);
        this.wss.to(room).emit('timer-finished');
        this.timers.delete(room);
      } else {
        timeLeft -= 1;

        this.wss.to(room).emit('timer-update', { timeLeft });
        this.timers.get(room).timeLeft = timeLeft;
      }
    }, updateInterval);

    this.timers.set(room, { timeLeft, interval });
    this.wss.to(room).emit('timer-started', { duration });
  }

  /**
   * @description  Handle timer update request
   * @param client
   * @returns  void
   * */
  @SubscribeMessage('request-timer-update')
  handleTimerUpdateRequest(client: Socket, room: string) {
    if (this.timers.has(room)) {
      const timeLeft = this.timers.get(room).timeLeft;
      client.emit('timer-update', { timeLeft });
    }
  }

  /**
   * @description  Handle stop timer request
   * @param client
   * @param payload
   * @returns  void
   * */
  @SubscribeMessage('stop-timer')
  handleStopTimer(client: Socket, payload: { room: string }) {
    const { room } = payload;
    if (this.timers.has(room)) {
      clearInterval(this.timers.get(room).interval);
      this.timers.delete(room);
      this.wss.to(room).emit('timer-stopped', { message: 'Timer stopped.' });
    }
  }

  /**
   * @description  Submit vote for the story in the room
   * @param client
   * @param room
   * @returns  void
   * */
  @SubscribeMessage('submit-vote')
  handleVote(client: Socket, payload: { room: string; vote: string }) {
    const { room, vote } = payload;
    const participant = client.data.participant;

    if (!this.votes.has(room)) {
      this.votes.set(room, new Map());
    }

    this.votes.get(room).set(participant.id, {
      value: vote,
      participant: participant,
    });

    this.emitVoteUpdate(room);
  }

  /**
   * @description  Emit vote update to the room
   * @param client
   * @param room
   * @returns  void
   * */
  private emitVoteUpdate(room: string) {
    const votes = this.votes.get(room);
    if (votes) {
      this.wss.to(room).emit('votes-updated', {
        votes: Array.from(votes.values()),
        participants: Array.from(
          this.participants_in_room.get(room)?.values() || [],
        ),
      });
    }
  }

  /**
   * @description  Complete voting for the story in the room
   * @param client
   * @param room
   * @returns  void
   * */
  @SubscribeMessage('complete-voting')
  handleCompleteVoting(client: Socket, room: string) {
    const votes = this.votes.get(room);
    const participantsMap = this.participants_in_room.get(room);

    if (!votes || votes.size < participantsMap.size) {
      client.emit('error', { value: 'Not all participants have voted yet' });
      return;
    }

    if (votes) {
      const numericVotes = Array.from(votes.values())
        .map((v) => parseInt(v.value))
        .filter((v) => !isNaN(v));

      const average =
        numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
      const sorted = [...numericVotes].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      this.avarageValue = average;

      this.wss.to(room).emit('voting-results', {
        average,
        median,
        mode: this.calculateMode(numericVotes),
        votes: Array.from(votes.values()),
      });
    }
  }

  /**
   * @description  Repeat voting for the same story in the room
   * @param client
   * @param room
   * @returns  void
   * */
  @SubscribeMessage('repeat-voting')
  handleRepeatVoting(client: Socket, room: string) {
    this.votes.delete(room);
    this.wss.to(room).emit('voting-repeated', {
      value: 'Voting has been reset',
    });
  }

  /**
   * @description  Calculate mode of the votes
   * @param client
   * @param room
   * @returns  void
   * */
  private calculateMode(numbers: number[]): number {
    const frequency = new Map<number, number>();
    numbers.forEach((n) => frequency.set(n, (frequency.get(n) || 0) + 1));
    return [...frequency.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  }

  /**
   * @description  Handle story change request for next story
   * @param client
   * @param room
   * @returns  void
   * */
  @SubscribeMessage('next-story')
  async handleNextStory(client: Socket, room: string) {
    const participantsMap = this.participants_in_room.get(room);
    const votesMap = this.votes.get(room);

    if (!votesMap || votesMap.size < participantsMap.size) {
      client.emit('error', { value: 'Not all participants have voted yet' });
      return;
    }

    try {
      const numericVotes = Array.from(this.votes.get(room).values())
        .map((v) => parseInt(v.value))
        .filter((v) => !isNaN(v));
      const average =
        numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;

      const votesToSave = Array.from(votesMap.values()).map((vote) => ({
        story_id: this.stories[this.currentStoryIndex].id,
        user_id: vote.participant.id,
        card_value: vote.value,
        final_value: average.toString(),
      }));

      await this.pokerWsService.saveVote(votesToSave, room);

      if (!this.historyByRoom.has(room)) {
        this.historyByRoom.set(room, []);
      }

      const newRecord = {
        story_title: this.stories[this.currentStoryIndex].title,
        story_id: this.stories[this.currentStoryIndex].id,
        card_value: average,
        history_date: new Date(),
      };

      this.historyByRoom.get(room).push(newRecord);

      const fullHistory = this.historyByRoom.get(room);
      this.wss.to(room).emit('voting-history-updated', fullHistory);

      this.currentStoryIndex =
        (this.currentStoryIndex + 1) % this.stories.length;
      this.wss
        .to(room)
        .emit('story-changed', this.stories[this.currentStoryIndex]);

      this.wss.to(room).emit('story-changed', {
        story: this.stories[this.currentStoryIndex],
        isLast: this.currentStoryIndex === this.stories.length - 1,
      });

      this.votes.delete(room);
      this.wss.to(room).emit('voting-repeated', {
        value: 'Voting has been reset',
      });
    } catch (error) {
      client.emit('error', { value: error.message });
    }
  }

  /**
   * @description  End session for the room and save the history
   * @param client
   * @param room
   * @returns  void
   * */
  @SubscribeMessage('end-session')
  async handleEndSession(client: Socket, room: string) {
    try {
      if (!this.historyByRoom.has(room)) {
        this.historyByRoom.set(room, []);
      }

      const newRecord = {
        story_title: this.stories[this.currentStoryIndex].title,
        story_id: this.stories[this.currentStoryIndex].id,
        card_value: this.avarageValue,
        history_date: new Date(),
      };

      this.historyByRoom.get(room).push(newRecord);

      const history = this.historyByRoom.get(room);
      if (history) {
        await this.pokerWsService.saveHistory(history, room);
      }

      this.wss.to(room).emit('session-ended', {
        message: 'Session has ended',
      });

      const socketsInRoom = this.wss.sockets.adapter.rooms.get(room);
      if (socketsInRoom) {
        socketsInRoom.forEach((socketId) => {
          const socketClient = this.wss.sockets.sockets.get(socketId);
          if (socketClient) {
            socketClient.leave(room);
            socketClient.disconnect(true);
          }
        });
      }

      this.participants_in_room.delete(room);
      this.votes.delete(room);
      this.historyByRoom.delete(room);
      this.timers.delete(room);
      this.pokerWsService.deactivateSession(room);

      if (this.timers.has(room)) {
        clearInterval(this.timers.get(room).interval);
      }

      client.emit('success', { value: 'Session ended successfully' });
    } catch (error) {
      console.error('Error ending session:', error);
      client.emit('error', { value: 'Failed to end session' });
    }
  }
}
