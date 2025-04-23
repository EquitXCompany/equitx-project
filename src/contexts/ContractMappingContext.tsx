import React, { createContext, useContext } from "react";
import { useQuery } from "react-query";
import { apiClient } from "../utils/apiClient";

type ContractMapping = Record<string, string>;

const ContractMappingContext = createContext<ContractMapping | undefined>(undefined);

export const ContractMappingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: contractMapping, isLoading, error } = useQuery<ContractMapping>(
    "contractMapping",
    async () => {
      const { data } = await apiClient.get('/api/assets/mapping');
      return data;
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading contract mapping</div>;

  return (
    <ContractMappingContext.Provider value={contractMapping}>
      {children}
    </ContractMappingContext.Provider>
  );
};

export const useContractMapping = () => {
  const context = useContext(ContractMappingContext);
  if (!context) {
    throw new Error("useContractMapping must be used within a ContractMappingProvider");
  }
  return context;
};
