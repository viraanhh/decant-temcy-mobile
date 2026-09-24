import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import * as addressService from "../services/addressService";

const AddressContext = createContext(null);

export function AddressProvider({ children }) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!user) {
      setAddresses([]);
      setSelectedAddressId(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    addressService.getAddresses()
      .then((list) => {
        setAddresses(list);
        const defaultAddr = list.find((a) => a.isDefault) || list[0];
        setSelectedAddressId(defaultAddr?.id ?? null);
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const addAddress = async (data) => {
    const isFirst = addresses.length === 0;
    const created = await addressService.createAddress({ ...data, isDefault: isFirst || data.isDefault });
    refresh();
    return created;
  };

  const removeAddress = async (id) => {
    await addressService.deleteAddress(id);
    refresh();
  };

  const setAsDefault = async (id) => {
    await addressService.setDefaultAddress(id);
    refresh();
  };

  const selectAddress = (id) => setSelectedAddressId(id);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || null;

  return (
    <AddressContext.Provider
      value={{ addresses, isLoading, selectedAddress, addAddress, removeAddress, setAsDefault, selectAddress }}
    >
      {children}
    </AddressContext.Provider>
  );
}

export function useAddress() {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error("useAddress must be used within AddressProvider");
  return ctx;
}