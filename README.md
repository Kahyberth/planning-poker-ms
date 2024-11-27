<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<h1 align="center">Planning Poker Microservice</h1>

<p align="center">
  Un microservicio modular y escalable construido con <a href="http://nestjs.com/" target="_blank">NestJS</a>, utilizando Docker, Redis y un servidor NATS para comunicación eficiente.
</p>

---


## 🚀 Características
- **NestJS**: Framework modular y escalable.
- **Docker Compose**: Para contenedores y orquestación.
- **NATS**: Mensajería eficiente para comunicación entre microservicios.
- **Hot Reloading**: Desarrollo ágil con `npm run start:dev`.

---

## 🛠️ Requisitos previos
Asegúrate de tener instalados los siguientes elementos en tu máquina:
- [Node.js](https://nodejs.org/) (v16 o superior recomendado)
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Redis](https://redis.io/)

---

## 📦 Instalación
Sigue estos pasos para configurar el entorno local:

1. Clona el repositorio:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd <NOMBRE_DEL_REPOSITORIO>

2. Ejecuta el siguiente comando para instalar las dependencias
 ```` 
 npm install 
 ````



## 💾 Genera y migra las tablas
Antes de usar el microservicio hay que asegurarse de generar las tablas y despues migrarlas

1. Usa el comando ```npm run db:gen ``` para generar las tablas

2. Usa el comando ```npm run db:migrate``` para migrar las tablas


## 🖥️ Uso
Asegúrate de estar dentro de la carpeta del proyecto

1. Levanta el servidor Nats
````
 docker-compose run -d 
 ````

2. Ejecuta el comando para correr el microservicio
````
  npm run start:dev
````
