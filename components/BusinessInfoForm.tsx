import React from 'react';
import type { BusinessInfo, FormData } from '../types';
import { Input } from './ui/Input';

interface BusinessInfoFormProps {
  data: BusinessInfo;
  updateData: (data: Partial<BusinessInfo>) => void;
  requestedAmount: string;
  updateParentData: (data: Partial<Omit<FormData, 'id'>>) => void;
}

export const BusinessInfoForm: React.FC<BusinessInfoFormProps> = ({ data, updateData, requestedAmount, updateParentData }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateData({ [e.target.name]: e.target.value });
  };

  const handleParentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateParentData({ [e.target.name]: e.target.value });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Input
        id="legalName"
        name="legalName"
        label="Business Legal Name"
        value={data.legalName}
        onChange={handleChange}
        required
      />
      <Input
        id="dbaName"
        name="dbaName"
        label="Business D/B/A Name"
        value={data.dbaName}
        onChange={handleChange}
      />
      <Input
        id="address"
        name="address"
        label="Business Address"
        value={data.address}
        onChange={handleChange}
        required
        className="md:col-span-2"
      />
      <Input
        id="phone"
        name="phone"
        label="Business Phone"
        type="tel"
        value={data.phone}
        onChange={handleChange}
        required
      />
      <Input
        id="taxId"
        name="taxId"
        label="Federal Tax ID #"
        value={data.taxId}
        onChange={handleChange}
        required
      />
      <Input
        id="requestedAmount"
        name="requestedAmount"
        label="Requested Funding Amount"
        type="number"
        value={requestedAmount}
        onChange={handleParentChange}
        required
      />
       <Input
        id="monthlyRevenue"
        name="monthlyRevenue"
        label="Avg. Monthly Revenue"
        type="number"
        value={data.monthlyRevenue}
        onChange={handleChange}
        required
      />
      <Input
        id="startDate"
        name="startDate"
        label="Business Start Date"
        type="date"
        value={data.startDate}
        onChange={handleChange}
        required
      />
       <Input
        id="recentNSFs"
        name="recentNSFs"
        label="Recent NSFs (last 3 months)"
        type="number"
        value={data.recentNSFs}
        onChange={handleChange}
        required
      />
      <Input
        id="industryType"
        name="industryType"
        label="Industry Type"
        value={data.industryType}
        onChange={handleChange}
        required
      />
       <Input
        id="entityType"
        name="entityType"
        label="Type of Entity"
        value={data.entityType}
        onChange={handleChange}
        required
      />
    </div>
  );
};