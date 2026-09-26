import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageCompose } from './message-compose';

describe('MessageCompose', () => {
  let component: MessageCompose;
  let fixture: ComponentFixture<MessageCompose>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageCompose],
    }).compileComponents();

    fixture = TestBed.createComponent(MessageCompose);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
