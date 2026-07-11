export interface Product {
  id: string;
  name: string;
  cameras: number;
  resolution: string;
  type: string; // "Indoor/Outdoor"
  dvr: string;
  accessories: string;
  storage: string;
  cable: string;
  price: number;
  priceFormatted: string;
  freebies: string[];
  features: string[];
  image: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  rating: number;
  text: string;
  date: string;
  isVerified?: boolean;
}

