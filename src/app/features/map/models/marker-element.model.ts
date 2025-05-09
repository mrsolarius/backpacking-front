export interface MarkerElement extends HTMLDivElement {
  _eventListeners?: {
    type: string;
    listener: EventListenerOrEventListenerObject;
    options?: boolean | AddEventListenerOptions;
  }[];
}
