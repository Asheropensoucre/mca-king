import React from 'react';
import type { OwnerInfo } from '../types';
import { Input } from './ui/Input';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';

interface OwnersFormProps {
  data: OwnerInfo[];
  updateData: (data: OwnerInfo[]) => void;
}

export const OwnersForm: React.FC<OwnersFormProps> = ({ data, updateData }) => {
  const handleOwnerChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const newOwners = [...data];
    newOwners[index] = { ...newOwners[index], [e.target.name]: e.target.value };
    updateData(newOwners);
  };

  const addOwner = () => {
    updateData([...data, {
      id: crypto.randomUUID(),
      name: '', homeAddress: '', signature: '', ownership: '', title: '',
      cellPhone: '', dateOfBirth: '', ssn: '', email: '', creditScore: '',
    }]);
  };

  const removeOwner = (index: number) => {
    const newOwners = data.filter((_, i) => i !== index);
    updateData(newOwners);
  };

  const totalOwnership = data.reduce((acc, owner) => acc + (parseFloat(owner.ownership) || 0), 0);

  return (
    <div className="space-y-8">
      {data.map((owner, index) => (
        <div key={owner.id} className="p-6 relative border border-line rounded-lg">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-main ">Owner #{index + 1}</h3>
            {data.length > 1 && (
              <PrimaryButton label="Remove" size="small" variant="danger" onClick={() => removeOwner(index)} />
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input id={`name-${index}`} name="name" label="Name" value={owner.name} onChange={(e) => handleOwnerChange(index, e)} required />
            <Input id={`title-${index}`} name="title" label="Title" value={owner.title} onChange={(e) => handleOwnerChange(index, e)} required />
            <Input id={`homeAddress-${index}`} name="homeAddress" label="Home Address" value={owner.homeAddress} onChange={(e) => handleOwnerChange(index, e)} required className="md:col-span-2" />
            <Input id={`cellPhone-${index}`} name="cellPhone" label="Cell Phone #" type="tel" value={owner.cellPhone} onChange={(e) => handleOwnerChange(index, e)} required />
            <Input id={`email-${index}`} name="email" label="Email" type="email" value={owner.email} onChange={(e) => handleOwnerChange(index, e)} required />
            <Input id={`dateOfBirth-${index}`} name="dateOfBirth" label="Date of Birth" type="date" value={owner.dateOfBirth} onChange={(e) => handleOwnerChange(index, e)} required />
            <Input id={`ssn-${index}`} name="ssn" label="SSN" value={owner.ssn} onChange={(e) => handleOwnerChange(index, e)} required />
            <Input id={`creditScore-${index}`} name="creditScore" label="Estimated Credit Score" type="number" value={owner.creditScore} onChange={(e) => handleOwnerChange(index, e)} required />
            <Input id={`ownership-${index}`} name="ownership" label="Business Ownership %" type="number" min="0" max="100" value={owner.ownership} onChange={(e) => handleOwnerChange(index, e)} required />
            <Input id={`signature-${index}`} name="signature" label="Signature (Type Full Name)" value={owner.signature} onChange={(e) => handleOwnerChange(index, e)} required className="md:col-span-2" />
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-6">
        <PrimaryButton label="+ Add Another Owner" size="small" onClick={addOwner} className="w-full sm:w-auto" />
        <div className="text-left sm:text-right">
            <p className="text-sm font-medium text-main">Total Ownership: <span className={`font-bold ${totalOwnership === 100 ? 'text-secondary' : 'text-danger'}`}>{totalOwnership}%</span></p>
            {totalOwnership !== 100 && <p className="text-xs text-danger">Total ownership must equal 100%.</p>}
        </div>
      </div>
    </div>
  );
};