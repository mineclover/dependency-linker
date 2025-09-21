import { Service } from './service';

export interface ComponentProps {
  message?: string;
}

export class SampleComponent {
  private service: Service;

  constructor(props: ComponentProps = {}) {
    this.service = new Service();
  }

  render(): string {
    return 'Hello World';
  }

  getMessage(): string {
    return this.service.getData();
  }
}