import {Socket} from 'phoenix';
import $ from 'jquery';

import Table from './table';
import Card from './card';
import Controls from './components/controls';
import RaiseControl from './components/raise-control';
import PlayerToolbar from './components/player-toolbar';
import ChatComponent from './components/chat-component';
import PlayerChipComponent from './components/player-chip-component';
import BankRollComponent from './components/bank-roll-component';
import SpinnerAnimation from './animations/spinner-animations';
import DataFormatter from './data-formatter';
import Dispatcher from './messages/dispatcher';

export default class Game {
  
  constructor(userName, roomTitle, type) {
    this.userName = userName;
    this.roomTitle = roomTitle;
    this.type = type;
    this.dataFormatter = new DataFormatter("game");
  }
  
  init() {
    SpinnerAnimation.onJoinPrivateRoom();
    let socket = new Socket('/socket', {params: 
      {token: window.playerToken}
    });
      
    socket.connect();
    let channel = socket.channel(`players:${this.roomTitle}`, {type: this.type});
    
    channel.join()
    .receive("ok", () => {
      console.log("joined");
    })
    .receive("error", () => {
      console.log("could not join channel");
    });
    
    this.playerToolbar = new PlayerToolbar(this.userName, this.roomTitle, channel);
    this.chatComponent = new ChatComponent(this.userName, channel);
    this.bankRollComponent = new BankRollComponent(this.userName, channel);
    this.chatComponent.init();
    this.bankRollComponent.init();
    
    const MESSAGES = [
      "private_room_join",
      "started_game", 
      "game_started",
      "update",
      "add_player_success",
      "player_seated",
      "game_finished",
      "winner_message",
      "new_message",
      "clear",
      "present_winning_hand",
      "update_bank_max",
      "update_emblem_display",
      "failed_bank_update"];
    MESSAGES.forEach((message) => {
      channel.on(message, (payload) => {
        Dispatcher.dispatch(message, payload, {
          game: this,
          channel: channel
        });
      });
    });
  }
  
  // private
  setup(payload, channel) {
    if (this.table) {
      this.table.clear(this.dataFormatter.format(this.addUser(payload)));
    }
    delete this.chatComponent;
    delete this.raiseControl;
    delete this.controls;
    delete this.table;
    let data = this.dataFormatter.format(this.addUser(payload));
    data.channel = channel;
    this.playerToolbar.update(data);
    this.table = new Table(data);
    this.controls = new Controls(data);
    this.raiseControl = new RaiseControl(data);
    this.chatComponent = new ChatComponent(this.userName, channel);
    this.playerChipComponent = new PlayerChipComponent(data);
    Card.renderPlayerCards(data.playerHand); 
    this.table.init(data);
    this.controls.update(data);
    this.raiseControl.init();
    this.raiseControl.update(data);
    this.chatComponent.init();
    this.playerChipComponent.init();
  }
  
  update(payload, channel) {
    let data = this.dataFormatter.format(this.addUser(payload));
    data.channel = channel;
    this.table.update(data);
    this.controls.update(data);
    this.raiseControl.update(data);
    this.playerChipComponent.update(data);
  }
  
  addUser(data) {
    data.user = this.userName;
    return data;
  }
}