import bedQueenIcon from '../assets/furniture/bed-queen.svg';
import bedSingleIcon from '../assets/furniture/bed-single.svg';
import wardrobeIcon from '../assets/furniture/wardrobe.svg';
import deskIcon from '../assets/furniture/desk.svg';
import chairIcon from '../assets/furniture/chair.svg';
import sofaIcon from '../assets/furniture/sofa-2seat.svg';
import diningTableIcon from '../assets/furniture/dining-table.svg';
import tvUnitIcon from '../assets/furniture/tv-unit.svg';
import burnerIcon from '../assets/furniture/burner.svg';
import plantIcon from '../assets/furniture/plant.svg';
import showerIcon from '../assets/furniture/shower.svg';
import sinkIcon from '../assets/furniture/sink.svg';
import toiletIcon from '../assets/furniture/toilet.svg';

import armchairIcon from '../assets/furniture/armchair.svg';

export const FURNITURE_CATALOG = [
  { id: 'bed-queen',    name: 'Queen Bed',            category: 'Beds',     width: 5,   height: 6.5, price: 450, color: '#c9a875', thumbnail: bedQueenIcon },
  { id: 'bed-single',  name: 'Single Bed',            category: 'Beds',     width: 3.2, height: 6.5, price: 300, color: '#c9a875', thumbnail: bedSingleIcon },
  { id: 'wardrobe',    name: 'Wardrobe',              category: 'Storage',  width: 4,   height: 2,   price: 350, color: '#8b6f47', thumbnail: wardrobeIcon },
  { id: 'desk',        name: 'Study Desk',            category: 'Work',     width: 4,   height: 2,   price: 150, color: '#a67c52', thumbnail: deskIcon },
  { id: 'chair',       name: 'Chair',                 category: 'Seating',  width: 1.7, height: 1.7, price: 80,  color: '#6b5b95', thumbnail: chairIcon },
  { id: 'armchair',    name: 'Armchair',              category: 'Seating',  width: 2.5, height: 2.5, price: 200, color: '#c25953', thumbnail: armchairIcon },
  { id: 'sofa-2seat',  name: '2-Seater Sofa',         category: 'Seating',  width: 5.5, height: 2.8, price: 500, color: '#5b7c99', thumbnail: sofaIcon },
  { id: 'dining-table',name: 'Dining Table (4-seat)', category: 'Dining',   width: 4,   height: 3,   price: 300, color: '#a67c52', thumbnail: diningTableIcon },
  { id: 'tv-unit',     name: 'TV Unit',               category: 'Storage',  width: 5,   height: 1.3, price: 200, color: '#444',    thumbnail: tvUnitIcon },
  { id: 'burner',      name: 'Stove / Burner',        category: 'Kitchen',  width: 2.5, height: 2,   price: 400, color: '#555',    thumbnail: burnerIcon },
  { id: 'plant',       name: 'Indoor Plant',          category: 'Decor',    width: 1.5, height: 1.5, price: 45,  color: '#2e8b57', thumbnail: plantIcon },
  { id: 'shower',      name: 'Shower Cabin',          category: 'Bathroom', width: 3,   height: 3,   price: 250, color: '#87ceeb', thumbnail: showerIcon },
  { id: 'sink',        name: 'Wash Basin',            category: 'Bathroom', width: 2,   height: 1.5, price: 120, color: '#ddd',    thumbnail: sinkIcon },
  { id: 'toilet',      name: 'Toilet',                category: 'Bathroom', width: 1.5, height: 2.5, price: 180, color: '#eee',    thumbnail: toiletIcon },
];