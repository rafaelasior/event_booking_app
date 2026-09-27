import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookEvent } from './book-event';

describe('BookEvent', () => {
  let component: BookEvent;
  let fixture: ComponentFixture<BookEvent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookEvent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookEvent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
