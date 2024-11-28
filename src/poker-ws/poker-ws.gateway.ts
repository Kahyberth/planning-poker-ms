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
    console.log('Client connected', client.id);
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
      const response = await axios.get(`${envs.ORIGIN_CORS}/api/auth/verify`, {
        withCredentials: true,
        headers: {
          Cookie: cookies,
        },
      });

      const user = await axios.post(
        `${envs.ORIGIN_CORS}/api/auth/find/${cookies}`,
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

        // Agregar participante a la sala
        if (!this.participants_in_room.has(room)) {
          this.participants_in_room.set(room, new Map<string, object>());
        }
        this.participants_in_room.get(room).set(client.id, participant_data);

        // Almacenar datos del cliente
        client.data.participant = participant_data;
        client.data.room = room;

        client.join(room);
        client.emit('success', { message: 'Joined room successfully' });

        console.log('participant', participant_data);

        // Emitir la lista actualizada de participantes
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
    console.log('room', room);
    const participantsMap = this.participants_in_room.get(room);
    if (participantsMap) {
      const participantsArray = Array.from(participantsMap.values());
      this.wss.to(room).emit('participant-list', participantsArray);
    }
  }

  @SubscribeMessage('send-message')
  onMessageRecived(client: Socket, message: string) {
    client.to(client.data.room).emit('message', {
      message,
      sender: client.data.participant,
    });
  }
}
