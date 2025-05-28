import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { envs } from '../commons/envs';
import { Chat } from '../commons/interfaces/ChatData';
import { PokerWsService } from './poker-ws.service';

interface Participant {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
}

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

  participants_in_room = new Map<string, Map<string, Participant>>();
  private votes = new Map<
    string,
    Map<string, { value: string; participant: any }>
  >();

  private roomStates = new Map<
    string,
    { stories: any[]; currentStoryIndex: number }
  >();

  private roomAvarage = new Map<string, number>();

  private historyByRoom = new Map<string, any[]>();

  private timers = new Map<
    string,
    { timeLeft: number; interval: NodeJS.Timeout }
  >();

  private leaderOverrides = new Map<string, boolean>();

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

    const sessionStatus = await this.pokerWsService.checkSessionStatus(room);
    if (sessionStatus && sessionStatus.is_started) {
      const wasInSession = await this.pokerWsService.wasUserInSession(
        room,
        client.handshake.auth.userProfile.id,
      );
      if (!wasInSession) {
        client.emit('error', {
          value: 'Session has already started. Cannot join now.',
        });
        return;
      }
    }

    const stories = await this.pokerWsService.requestDeck(room);

    if (!stories || stories.length === 0) {
      client.emit('error', { value: 'No stories available' });
      return;
    }

    if (!this.roomStates.has(room)) {
      this.roomStates.set(room, { stories, currentStoryIndex: 0 });
    }

    if (this.historyByRoom.has(room)) {
      const history = this.historyByRoom.get(room);
      client.emit('voting-history-updated', history);
    }

    if (this.timers.has(room)) {
      const timer = this.timers.get(room);
      client.emit('timer-started', { duration: timer.timeLeft });
    }

    const { currentStoryIndex } = this.roomStates.get(room);

    client.emit('story-changed', {
      story: stories[currentStoryIndex],
      isLast: currentStoryIndex === stories.length - 1,
    });

    try {
      const user = client.handshake.auth.userProfile;

      const participant_data = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.profile.profile_picture,
        role: user.role,
      };

      if (!this.participants_in_room.has(room)) {
        this.participants_in_room.set(room, new Map<string, Participant>());
      }

      const participantsMap = this.participants_in_room.get(room);

      participantsMap.set(user.id, participant_data);

      const chatHistory = await this.pokerWsService.getChatHistory(room);
      client.emit('chat-history', chatHistory);

      client.data.participant = participant_data;
      client.data.room = room;
      client.join(room);
      client.emit('success', { value: 'Joined room successfully' });
      this.emitParticipantList(room);
      this.handleRoomCreator(client, room);

      const session = await this.pokerWsService.checkSessionStatus(room);
      client.emit('session-status', {
        isStarted: session?.is_started || false,
      });

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
      this.wss.emit('participant-count-updated', {
        roomId: room,
        count: participantsArray.length,
      });
    }
  }

  @SubscribeMessage('participant-count-updated')
  handleParticipantCountUpdated(
    client: Socket,
    payload: { roomId: string; count: number },
  ) {
    const { roomId, count } = payload;
    this.wss.to(roomId).emit('participant-count-from-server', {
      roomId,
      count,
    });
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
   * @description  Get room creator
   * @param client
   * @param room
   * @returns  void
   */
  async handleRoomCreator(client: Socket, room: string) {
    const room_leader = await this.pokerWsService.roomCreator(room);
    if (room_leader) {
      client.emit('room-creator', room_leader);
      return;
    } else {
      client.emit('error', { value: 'Room not found' });
      return;
    }
  }

  /**
   * @description  Send message to room
   * @param client
   * @param payload
   * @returns  void
   */
  @SubscribeMessage('send-message')
  async onMessageReceived(client: Socket, payload: Chat) {
    const { message, room } = payload;

    try {
      const savedChat = await this.pokerWsService.saveChatMessage(
        room,
        client.data.participant,
        message,
      );

      this.wss.to(room).emit('message', {
        message: savedChat.message,
        sender: client.data.participant,
        timestamp: savedChat.message_date,
      });
    } catch (error) {
      client.emit('error', { value: error });
    }
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

      // Check if all votes are valid Fibonacci numbers
      const allValidFibonacci = numericVotes.every((v) =>
        this.isValidFibonacciNumber(v),
      );
      if (!allValidFibonacci) {
        client.emit('error', {
          value: 'All votes must be valid Fibonacci numbers',
        });
        return;
      }

      const average =
        numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
      const sorted = [...numericVotes].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const mode = this.calculateMode(numericVotes);

      this.roomAvarage.set(room, average);

      this.wss.to(room).emit('voting-results', {
        average,
        median,
        mode,
        votes: Array.from(votes.values()),
        hasConsensus: this.hasConsensus(votes),
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

  private isValidFibonacciNumber(num: number): boolean {
    const fibonacciSequence = [0, 1, 2, 3, 5, 8, 13, 21, 34];
    return fibonacciSequence.includes(num);
  }

  @SubscribeMessage('leader-override-vote')
  async handleLeaderOverride(
    client: Socket,
    payload: { room: string; vote: string },
  ) {
    const { room, vote } = payload;
    const participant = client.data.participant;
    const roomLeader = await this.pokerWsService.roomCreator(room);

    if (participant.id.toString() !== roomLeader) {
      client.emit('error', {
        value: 'Only the room leader can override votes',
      });
      return;
    }

    const voteValue = parseInt(vote);
    if (!this.isValidFibonacciNumber(voteValue)) {
      client.emit('error', { value: 'Vote must be a valid Fibonacci number' });
      return;
    }

    // Set all votes to the leader's choice
    if (!this.votes.has(room)) {
      this.votes.set(room, new Map());
    }

    const participantsMap = this.participants_in_room.get(room);
    participantsMap.forEach((participant) => {
      this.votes.get(room).set(participant.id, {
        value: vote,
        participant: participant,
      });
    });

    // Mark that leader has used override for this story
    this.leaderOverrides.set(room, true);

    this.emitVoteUpdate(room);
    this.handleCompleteVoting(client, room);
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
    const roomState = this.roomStates.get(room);
    if (!roomState) {
      client.emit('error', { value: 'Room state not found' });
      return;
    }
    const { stories, currentStoryIndex } = roomState;

    if (!votesMap || votesMap.size < participantsMap.size) {
      client.emit('error', { value: 'Not all participants have voted yet' });
      return;
    }

    // Check for consensus or leader override before allowing to move to next story
    if (!this.hasConsensus(votesMap) && !this.leaderOverrides.get(room)) {
      client.emit('error', {
        value:
          'Cannot proceed to next story without consensus. Use leader override or discuss to reach agreement.',
      });
      return;
    }

    try {
      const numericVotes = Array.from(this.votes.get(room).values())
        .map((v) => parseInt(v.value))
        .filter((v) => !isNaN(v));
      const average = numericVotes[0]; // Since we have consensus or leader override, all votes are the same

      const votesToSave = Array.from(votesMap.values()).map((vote) => ({
        story_id: stories[currentStoryIndex].id,
        user_id: vote.participant.id,
        card_value: vote.value,
        final_value: average.toString(),
      }));

      await this.pokerWsService.saveVote(votesToSave, room);

      if (!this.historyByRoom.has(room)) {
        this.historyByRoom.set(room, []);
      }

      const newRecord = {
        story_title: stories[currentStoryIndex].title,
        story_id: stories[currentStoryIndex].id,
        card_value: average,
        history_date: new Date(),
      };

      this.historyByRoom.get(room).push(newRecord);

      const fullHistory = this.historyByRoom.get(room);
      this.wss.to(room).emit('voting-history-updated', fullHistory);

      roomState.currentStoryIndex = (currentStoryIndex + 1) % stories.length;
      const newIndex = roomState.currentStoryIndex;
      this.wss.to(room).emit('story-changed', {
        story: stories[newIndex],
        isLast: newIndex === stories.length - 1,
      });

      // Reset votes and leader override for next story
      this.votes.delete(room);
      this.leaderOverrides.delete(room);
      this.wss.to(room).emit('voting-repeated', {
        value: 'Voting has been reset',
      });
    } catch (error) {
      client.emit('error', { value: error.message });
    }
  }

  /**
   * @description  If the session has already started, it must not allow the entry of new participants
   * @param client
   * @param room
   * @returns  void
   * */
  @SubscribeMessage('check-session-status')
  async handleCheckSessionStatus(client: Socket, room: string) {
    const session = await this.pokerWsService.checkSessionStatus(room);
    if (session) {
      client.emit('error', { value: 'Session already started' });
    }
    client.emit('session-status', { value: session });
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

      const roomState = this.roomStates.get(room);
      if (!roomState) {
        client.emit('error', { value: 'Room state not found' });
        return;
      }

      const votesMap = this.votes.get(room);
      const { stories, currentStoryIndex } = roomState;

      const newRecord = {
        story_title: stories[currentStoryIndex].title,
        story_id: stories[currentStoryIndex].id,
        card_value: this.roomAvarage.get(room),
        history_date: new Date(),
      };

      this.historyByRoom.get(room).push(newRecord);

      const numericVotes = Array.from(this.votes.get(room).values())
        .map((v) => parseInt(v.value))
        .filter((v) => !isNaN(v));

      const average =
        numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;

      const votesToSave = Array.from(votesMap.values()).map((vote) => ({
        story_id: stories[currentStoryIndex].id,
        user_id: vote.participant.id,
        card_value: vote.value,
        final_value: average.toString(),
      }));

      await this.pokerWsService.saveVote(votesToSave, room);

      const history = this.historyByRoom.get(room);
      if (history) {
        await this.pokerWsService.saveHistory(history, room);
      }

      this.wss.to(room).emit('session-ended', {
        message: 'Session has ended',
      });

      const participantsMap = this.participants_in_room.get(room);
      if (participantsMap) {
        console.log('participantsMap', participantsMap);
        for (const [participantId, participant] of participantsMap.entries()) {
          console.log(participantId, participant);
          this.pokerWsService.leaveSession(room, participantId);
        }
      }

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

  private hasConsensus(
    votes: Map<string, { value: string; participant: any }>,
  ): boolean {
    const values = Array.from(votes.values()).map((v) => parseInt(v.value));
    if (values.length === 0) return false;

    const firstValue = values[0];
    return values.every((v) => v === firstValue);
  }

  @SubscribeMessage('start-session')
  async handleStartSession(client: Socket, room: string) {
    const participant = client.data.participant;
    const roomLeader = await this.pokerWsService.roomCreator(room);

    if (participant.id.toString() !== roomLeader) {
      client.emit('error', {
        value: 'Only the room leader can start the session',
      });
      return;
    }

    try {
      await this.pokerWsService.startSession(room);
      this.wss.to(room).emit('session-started', {
        message: 'Session has started',
      });
      this.wss.emit('session-status-changed', {
        sessionId: room,
        status: 'live',
      });
    } catch (error) {
      client.emit('error', { value: error.message });
    }
  }
}
