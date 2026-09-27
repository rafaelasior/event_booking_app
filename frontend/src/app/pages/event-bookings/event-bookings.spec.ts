import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventBookings } from './event-bookings';

describe('EventBookings', () => {
  let component: EventBookings;
  let fixture: ComponentFixture<EventBookings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventBookings],
    }).compileComponents();

    fixture = TestBed.createComponent(EventBookings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
