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

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    const room = client.data.room;
    const participant = client.data.participant;

    if (room && participant) {
      const participantsMap = this.participants_in_room.get(room);
      if (participantsMap) {
        participantsMap.delete(client.id);
        if (participantsMap.size === 0) {
          this.participants_in_room.delete(room);
        }
        this.emitParticipantList(room);
      }
    }
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(client: Socket, room: string) {
    if (!room) {
      client.emit('error', { message: 'Missing room' });
      return;
    }

    if (this.timers.has(room)) {
      const timer = this.timers.get(room);
      client.emit('timer-started', { duration: timer.timeLeft });
    }

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
      this.participants_in_room.get(room).set(client.id, participant_data);
      client.data.participant = participant_data;
      client.data.room = room;
      client.join(room);
      client.emit('success', { message: 'Joined room successfully' });
      this.emitParticipantList(room);

      if (this.votes.has(room) && this.votes.get(room).size > 0) {
        this.emitVoteUpdate(room);
      }
    } catch (error) {
      client.emit('error', { message: 'Token verification failed' });
      console.log('error', error);
    }
  }

  private emitParticipantList(room: string) {
    const participantsMap = this.participants_in_room.get(room);
    if (participantsMap) {
      const participantsArray = Array.from(participantsMap.values());
      this.wss.to(room).emit('participant-list', participantsArray);
    }
  }

  @SubscribeMessage('send-message')
  onMessageReceived(client: Socket, payload: Chat) {
    const { message, room } = payload;
    client.to(room).emit('message', {
      message,
      sender: client.data.participant,
    });
  }

  private timers = new Map<
    string,
    { timeLeft: number; interval: NodeJS.Timeout }
  >();

  @SubscribeMessage('start-timer')
  handleStartTimer(
    client: Socket,
    payload: { room: string; duration: number },
  ) {
    const { room, duration } = payload;

    // Limpiar timer existente
    if (this.timers.has(room)) {
      clearInterval(this.timers.get(room).interval);
    }

    let timeLeft = duration;
    const updateInterval = 1000; // Actualizar cada segundo

    const interval = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(interval);
        this.wss.to(room).emit('timer-finished');
        this.timers.delete(room);
      } else {
        timeLeft -= 1;
        // Emitir a toda la sala el tiempo actualizado
        this.wss.to(room).emit('timer-update', { timeLeft });
        this.timers.get(room).timeLeft = timeLeft;
      }
    }, updateInterval);

    this.timers.set(room, { timeLeft, interval });
    // Notificar a todos que el timer inició
    this.wss.to(room).emit('timer-started', { duration });
  }

  @SubscribeMessage('request-timer-update')
  handleTimerUpdateRequest(client: Socket, room: string) {
    if (this.timers.has(room)) {
      const timeLeft = this.timers.get(room).timeLeft;
      client.emit('timer-update', { timeLeft });
    }
  }

  @SubscribeMessage('stop-timer')
  handleStopTimer(client: Socket, payload: { room: string }) {
    const { room } = payload;
    if (this.timers.has(room)) {
      clearInterval(this.timers.get(room).interval);
      this.timers.delete(room);
      this.wss.to(room).emit('timer-stopped', { message: 'Timer stopped.' });
    }
  }

  @SubscribeMessage('submit-vote')
  handleVote(client: Socket, payload: { room: string; vote: string }) {
    const { room, vote } = payload;
    const participant = client.data.participant;

    if (!this.votes.has(room)) {
      this.votes.set(room, new Map());
    }

    // Registrar el voto
    this.votes.get(room).set(participant.id, {
      value: vote,
      participant: participant,
    });

    // Notificar a todos los participantes
    this.emitVoteUpdate(room);
  }

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

  @SubscribeMessage('complete-voting')
  handleCompleteVoting(client: Socket, room: string) {
    const votes = this.votes.get(room);
    if (votes) {
      // Calcular resultados
      const numericVotes = Array.from(votes.values())
        .map((v) => parseInt(v.value))
        .filter((v) => !isNaN(v));

      const average =
        numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
      const sorted = [...numericVotes].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      // Enviar resultados
      this.wss.to(room).emit('voting-results', {
        average,
        median,
        mode: this.calculateMode(numericVotes),
        votes: Array.from(votes.values()),
      });

      // Limpiar votos
      this.votes.delete(room);
    }
  }

  private calculateMode(numbers: number[]): number {
    // Implementación del cálculo de moda
    const frequency = new Map<number, number>();
    numbers.forEach((n) => frequency.set(n, (frequency.get(n) || 0) + 1));
    return [...frequency.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  }
}
