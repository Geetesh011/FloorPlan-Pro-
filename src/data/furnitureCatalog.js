import bedQueenIcon from '../assets/furniture/bed-queen.svg';
import bedSingleIcon from '../assets/furniture/bed-single.svg';
import wardrobeIcon from '../assets/furniture/wardrobe.svg';
import deskIcon from '../assets/furniture/desk.svg';
import chairIcon from '../assets/furniture/chair.svg';
import sofaIcon from '../assets/furniture/sofa-2seat.svg';
import diningTableIcon from '../assets/furniture/dining-table.svg';
import tvUnitIcon from '../assets/furniture/tv-unit.svg';

export const FURNITURE_CATALOG = [
  { id: 'bed-queen',    name: 'Queen Bed',            category: 'Beds',     width: 5,   height: 6.5, price: 450, color: '#c9a875', icon: bedQueenIcon },
  { id: 'bed-single',  name: 'Single Bed',            category: 'Beds',     width: 3.2, height: 6.5, price: 300, color: '#c9a875', icon: bedSingleIcon },
  { id: 'wardrobe',    name: 'Wardrobe',              category: 'Storage',  width: 4,   height: 2,   price: 350, color: '#8b6f47', icon: wardrobeIcon },
  { id: 'desk',        name: 'Study Desk',            category: 'Work',     width: 4,   height: 2,   price: 150, color: '#a67c52', icon: deskIcon },
  { id: 'chair',       name: 'Chair',                 category: 'Seating',  width: 1.7, height: 1.7, price: 80,  color: '#6b5b95', icon: chairIcon },
  { id: 'sofa-2seat',  name: '2-Seater Sofa',         category: 'Seating',  width: 5.5, height: 2.8, price: 500, color: '#5b7c99', icon: sofaIcon },
  { id: 'dining-table',name: 'Dining Table (4-seat)', category: 'Dining',   width: 4,   height: 3,   price: 300, color: '#a67c52', icon: diningTableIcon },
  { id: 'tv-unit',     name: 'TV Unit',               category: 'Storage',  width: 5,   height: 1.3, price: 200, color: '#444',    icon: tvUnitIcon },
];