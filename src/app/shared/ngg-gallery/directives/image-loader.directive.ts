import { Directive, ElementRef, OnInit } from '@angular/core';

@Directive({
  selector: '[appImageLoader]',
  standalone: true
})
export class ImageLoaderDirective implements OnInit {
  constructor(private el: ElementRef) {}

  ngOnInit() {
    const pictureElement = this.el.nativeElement as HTMLPictureElement;
    const imgElement = pictureElement.querySelector('img');

    if (imgElement) {
      // Appliquer un effet de flou jusqu'à ce que l'image soit chargée
      imgElement.style.filter = 'blur(8px)';
      imgElement.style.transition = 'filter 0.3s ease';

      // Ajouter une classe pour l'animation quand l'image est chargée
      imgElement.addEventListener('load', () => {
        imgElement.style.filter = 'blur(0)';
        imgElement.classList.add('fade-in');
      });

      // Gérer les erreurs de chargement
      imgElement.addEventListener('error', () => {
        // Remplacer par une image de placeholder
        imgElement.src = 'assets/placeholder.webp';
        imgElement.style.filter = 'blur(0)';
      });
    }
  }
}
