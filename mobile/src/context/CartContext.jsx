import React, { createContext, useState, useContext, useEffect } from 'react';
import { AuthContext } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [cart, setCart] = useState({}); // { productId: { item, quantity } }
  useEffect(() => { setCart({}); }, [user?._id]);

  const addToCart = (item) => {
    if (!item?._id || !Number.isFinite(item.price) || !Number.isFinite(item.stock) || item.stock <= 0) return;
    setCart(prev => {
      const existing = prev[item._id];
      if ((existing?.quantity || 0) >= item.stock) return prev;
      return {
        ...prev,
        [item._id]: {
          item,
          quantity: (existing?.quantity || 0) + 1
        }
      };
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const existing = prev[productId];
      if (!existing) return prev;
      
      const newCart = { ...prev };
      if (existing.quantity <= 1) {
        delete newCart[productId];
      } else {
        newCart[productId] = { ...existing, quantity: existing.quantity - 1 };
      }
      return newCart;
    });
  };

  const removeItem = (productId) => {
    setCart(prev => {
      const newCart = { ...prev };
      delete newCart[productId];
      return newCart;
    });
  };

  const clearCart = () => setCart({});

  const cartTotal = Object.values(cart).reduce((total, { item, quantity }) => {
    return total + (item.price * quantity);
  }, 0);

  const cartCount = Object.values(cart).reduce((total, { quantity }) => total + quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cart, addToCart, removeFromCart, removeItem, clearCart, cartTotal, cartCount 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
