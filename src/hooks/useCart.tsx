import { exception } from 'node:console';
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find(item => item.id === productId);
      const productInStock = await findProductInStockById(productId);

      let product: Product;
      let isNewProduct = false;

      if (productInCart) {
        product = {
          ...productInCart,
          amount: productInCart.amount + 1,
        };
      } else {
        const newProduct = await findProductById(productId);

        product = {
          ...newProduct,
          amount: 1,
        }

        isNewProduct = true;
      }

      if (product.amount > productInStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (isNewProduct) {
        const updatedCart = [
          ...cart,
          product,
        ]

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        await updateProductAmount({ productId, amount: product.amount });
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findProduct = cart.find(item => item.id === productId);

      if (!findProduct)
        throw Error;

      const updatedCart = cart.filter(item => item.id !== productId);

      setCart(updatedCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0)
      return;

    try {
      const productInStock = await findProductInStockById(productId);

      if (amount > productInStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map(item => {
        if (item.id === productId) {
          return {
            ...item,
            amount,
          }
        }

        return item;
      });

      setCart(updatedCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  const findProductById = async (
    productId: number,
  ): Promise<Product> => {
    const { data } = await api.get<Product>(`products/${productId}`);
    return data;
  }

  const findProductInStockById = async (
    productId: number,
  ): Promise<Stock> => {

    const { data } = await api.get<Stock>(`stock/${productId}`);

    return data;
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
