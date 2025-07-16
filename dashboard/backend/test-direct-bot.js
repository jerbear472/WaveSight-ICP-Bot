/**
 * Direct test of bot functionality
 */

const io = require('socket.io-client');

const socket = io('http://localhost:3001');

socket.on('connect', () => {
    console.log('✅ Connected to backend');
    
    console.log('🚀 Starting Instagram bot...');
    socket.emit('start-bot', {
        platform: 'instagram',
        profileType: 'gen_z_tech_enthusiast',
        duration: 60000 // 1 minute
    });
});

socket.on('bot-started', (data) => {
    console.log('✅ Bot started:', data);
});

socket.on('bot-status', (data) => {
    console.log('📊 Status:', data);
});

socket.on('bot-status-update', (data) => {
    console.log('📊 Status Update:', data);
});

socket.on('content-discovered', (data) => {
    console.log('🔍 Content discovered:', {
        platform: data.content.platform,
        creator: data.content.creator,
        likes: data.content.likes,
        caption: data.content.caption?.substring(0, 50) + '...'
    });
});

socket.on('bot-engagement', (data) => {
    console.log('💚 Engagement:', data);
});

socket.on('session-complete', (data) => {
    console.log('✅ Session complete:', data);
    process.exit(0);
});

socket.on('bot-error', (data) => {
    console.error('❌ Error:', data);
    process.exit(1);
});

socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
});

console.log('🔌 Connecting to backend...');