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
import axios from 'axios';
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

  handleConnection(client: Socket) {
    console.log(
      'Client connected:',
      client.id,
      'with handshake headers:',
      client.handshake.headers,
    );
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

    try {
      const cookies = client.handshake.headers.cookie;
      const response = await axios.get(
        `${envs.CLIENT_GATEWAY_URL}/api/auth/verify`,
        {
          withCredentials: true,
          headers: {
            Cookie: cookies,
          },
        },
      );

      const user = await axios.post(
        `${envs.CLIENT_GATEWAY_URL}/api/auth/find/${cookies}`,
      );

      console.log('user', user.status, 'response', response.status);

      if (response.status === 200 && user.status === 201) {
        const participant = user.data.user[0];
        const participant_data = {
          token: cookies,
          email: participant.email,
          name: participant.name,
          avatar: `https://www.gravatar.com/avatar/${md5(participant.email.trim().toLowerCase())}?s=200&d=identicon`,
          id: participant.id,
          vote: 0,
          role: 'Developer',
        };

        console.log(`Avatar: ${participant_data.avatar}`);

        if (!this.participants_in_room.has(room)) {
          this.participants_in_room.set(room, new Map<string, object>());
        }
        this.participants_in_room.get(room).set(client.id, participant_data);

        client.data.participant = participant_data;
        client.data.room = room;

        client.join(room);
        client.emit('success', { message: 'Joined room successfully' });

        console.log('participant', client.data.participant);
        console.log('room ->', client.data.room);
        console.log('client_id ->', client.id);

        this.emitParticipantList(room);
      } else {
        client.emit('error', { message: 'Invalid token' });
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

  /**
   * TODO: Modificar la función para que reciba los datos desde client.data
   */
  @SubscribeMessage('send-message')
  onMessageReceived(client: Socket, payload: Chat) {
    const { message, room } = payload;
    console.log(payload);
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

    if (this.timers.has(room)) {
      clearInterval(this.timers.get(room).interval);
    }

    let timeLeft = duration;

    const interval = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(interval);
        this.wss
          .to(room)
          .emit('timer-finished', { message: 'Timer finished!' });
        this.timers.delete(room);
      } else {
        timeLeft -= 1;
        this.wss.to(room).emit('timer-update', { timeLeft });
      }
    }, 1000);

    this.timers.set(room, { timeLeft, interval });
    this.wss.to(room).emit('timer-started', { timeLeft });
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
}
