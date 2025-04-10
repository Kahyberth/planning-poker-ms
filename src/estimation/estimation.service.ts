import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { envs } from 'src/commons/envs';

@Injectable()
export class EstimationService {
  private openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: `${envs.DEEPSEEK_API_KEY}`
});

  async getStoryEstimation(data: {
    title: string;
    description: string;
    priority: string;
    acceptanceCriteria?: string[];
    votes: number[];
    complexityFactors: string[];
    descriptionClarity: string;
  }) {
    const prompt = this.createPrompt(data);

    const completion = await this.openai.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: 'Eres una IA que participa en sesiones de Planning Poker y ayuda sugiriendo estimaciones.',
        },
        { role: 'user', content: prompt },
      ],
      model: 'deepseek-chat',
    });

    let responseText  = completion.choices[0].message.content;
    responseText = responseText.replace(/```json|```/g, '').trim();
    return JSON.parse(responseText);
  }

  

  private createPrompt({
    title,
    description,
    priority,
    acceptanceCriteria,
    votes,
    complexityFactors,
    descriptionClarity,
  }: {
    title: string;
    description: string;
    priority: string;
    acceptanceCriteria?: string[];
    votes: number[];
    complexityFactors: string[];
    descriptionClarity: string;
  }): string {
    return `
Eres una IA que participa en una sesión de Planning Poker. Tu tarea es sugerir una estimación en puntos para la siguiente historia de usuario:

Historia de Usuario:
- Título: ${title}
- Descripción: ${description}
- Prioridad: ${priority}
- Criterios de aceptación: ${acceptanceCriteria?.join(', ') || 'No especificados'}

Votos individuales del equipo: [${votes.join(', ')}]

Análisis adicional:
- Complejidad técnica intrínseca: ${complexityFactors.join(', ')}
- Longitud y claridad de la descripción: ${descriptionClarity}

Debes responder indicando:
- Puntuación sugerida (secuencia Fibonacci)
- Confianza (%)
- Justificación breve

Formato de respuesta requerido (JSON):

{
  "puntuacion_sugerida": valor_numérico,
  "confianza": valor_porcentual,
  "justificacion": "texto breve"
}
    `;
  }
}
