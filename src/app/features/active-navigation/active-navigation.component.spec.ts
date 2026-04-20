import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveNavigationComponent } from './active-navigation.component';

describe('ActiveNavigation', () => {
  let component: ActiveNavigationComponent;
  let fixture: ComponentFixture<ActiveNavigationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveNavigationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveNavigationComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
