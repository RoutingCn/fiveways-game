import { Game } from './game.js';
import { GameUI } from './ui.js';


const game = new Game({ mode: 'ai', difficulty: 'normal' });
const ui = new GameUI(game);

window.fiveways = Object.freeze({ game, ui });
