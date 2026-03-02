import { Component, OnInit } from '@angular/core';
import { Tts } from '../../services/tts';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {

  constructor(
    private tts: Tts
  ) {

  }
  ngOnInit() {
      setTimeout(() => {
        this.tts.speak('Bienvenido a IndoorNav. El motor nativo esta configurado correctamente');
      }, 1000);
  }

  probarVoz() {
    this.tts.speak('Boton de categorias Aulas presionado');
  }
}
