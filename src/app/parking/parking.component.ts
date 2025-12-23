import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ParkingService } from '../core/services/parking.service';
import { ParkingStats, Batiment } from '../core/models/parking.model';

@Component({
  selector: 'app-parking',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './parking.component.html',
  styleUrl: './parking.component.scss'
})
export class ParkingComponent implements OnInit {
  private parkingService = inject(ParkingService);
  private router = inject(Router);

  selectedDate: string = new Date().toISOString().split('T')[0]; // Date sélectionnée pour filtrer

  cimesStats: ParkingStats = {
    totalPlaces: 50,
    placesUtilisees: 0,
    placesRestantes: 50,
    pourcentageUtilise: 0
  };

  vallonStats: ParkingStats = {
    totalPlaces: 50,
    placesUtilisees: 0,
    placesRestantes: 50,
    pourcentageUtilise: 0
  };

  isLoading: boolean = false;

  async ngOnInit(): Promise<void> {
    await this.loadStats();
  }

  async loadStats(): Promise<void> {
    this.isLoading = true;
    try {
      const selectedDateObj = new Date(this.selectedDate);
      const stats = await this.parkingService.getAllStats(selectedDateObj);
      this.cimesStats = stats.cimes;
      this.vallonStats = stats.vallon;
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async onDateChange(): Promise<void> {
    await this.loadStats();
  }

  previousDay(): void {
    const currentDate = new Date(this.selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    this.selectedDate = currentDate.toISOString().split('T')[0];
    this.onDateChange();
  }

  nextDay(): void {
    const currentDate = new Date(this.selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    this.selectedDate = currentDate.toISOString().split('T')[0];
    this.onDateChange();
  }

  navigateToBatiment(batiment: Batiment): void {
    this.router.navigate(['/parking', batiment], { queryParams: { date: this.selectedDate } });
  }
}
