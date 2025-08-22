# Server Monitor

Monitoriza el estado de tus servidores en tiempo real con pings reales y una interfaz web moderna.

---

## Instalación

### 1. Clona el repositorio o crea el directorio del proyecto
```bash
mkdir server-monitor
cd server-monitor
```

### 2. Inicializa el proyecto Node.js
```bash
npm init -y
```

### 3. Instala las dependencias necesarias
```bash
npm install express socket.io ping cors
npm install -D nodemon
```

### 4. Estructura de directorios
```
server-monitor/
├── server.js
├── package.json
└── public/
    └── index.html
```

### 5. Scripts recomendados en `package.json`
```json
"scripts" {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

### 6. Ejecuta el servidor
- Modo desarrollo:
  ```bash
  npm run dev
  ```
- Modo producción:
  ```bash
  npm start
  ```

### 7. Accede a la web
Abre tu navegador en [http://localhost:3000](http://localhost:3000)

---

## Características

- **Ping real** a servidores usando la librería `ping` (ICMP)
- **Conexión WebSocket** en tiempo real con Socket.IO
- **Backend robusto** con Express.js
- **Detección automática** de cambios de estado
- **Notificaciones push** en tiempo real
- **Gráficos de uptime y latencia** con Chart.js
- **Animaciones** con Animate.css
- **Efectos visuales** con Particles.js
- **Diseño responsive y profesional** con Bootstrap
- **API REST** para ping individual
- **Logs de actividad** en tiempo real
- **Monitoreo automático** cada 30 segundos
- **Sonidos de alerta** para servidores críticos
- **Manejo robusto de errores y reconexión**
- **Atajos de teclado** (F5: refresh, F2: toggle monitoreo)

---

## Requisitos del sistema

- Node.js 14 o superior
- Permisos para ejecutar ping en el sistema
- Red accesible a los servidores configurados
- Puerto 3000 disponible (o configurar variable `PORT`)

---

## Despliegue en producción

### 1. Usar PM2 para mantener la aplicación activa
```bash
npm install -g pm2
pm2 start server.js --name "server-monitor"
pm2 startup
pm2 save
```

### 2. Configurar Nginx como reverse proxy (opcional)
```nginx
location / {
  proxy_pass http://localhost:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
  proxy_cache_bypass $http_upgrade;
}
```

### 3. Para HTTPS, agrega certificados SSL y configura Nginx apropiadamente.

---

## Pendiente por implementar / Mejoras sugeridas

- [ ] Panel de configuración de servidores desde la web
- [ ] Gestión de usuarios y autenticación
- [ ] Personalización de alertas y sonidos
- [ ] Exportación de logs y reportes
- [ ] Dashboard avanzado con más métricas (CPU, RAM, disco)
- [ ] Internacionalización (multi-idioma)
- [ ] Mejorar accesibilidad (A11y)
- [ ] Tests automáticos y CI/CD

---

¡El sistema está listo para hacer ping REAL a tus servidores y mostrar el estado en tiempo real!

