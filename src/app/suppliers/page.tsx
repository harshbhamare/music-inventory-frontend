'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Supplier } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { Users2, Plus, Phone, Mail, MapPin, Search, Edit2, Trash2, Building2 } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function SuppliersPage() {
  const { canManageSuppliers, isSuperAdmin } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal & form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ suppliers: Supplier[] }>('/meta/suppliers');
      setSuppliers(res.suppliers || []);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    setNotes('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setContactPerson(s.contactPerson || '');
    setEmail(s.email || '');
    setPhone(s.phone || '');
    setAddress(s.address || '');
    setNotes(s.notes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);

    try {
      const payload = {
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        email: email.trim().toLowerCase() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (editingSupplier) {
        await api.put(`/meta/suppliers/${editingSupplier._id}`, payload);
      } else {
        await api.post('/meta/suppliers', payload);
      }

      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save supplier.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSupplier = async (supplier: Supplier) => {
    if (!window.confirm(`Are you sure you want to remove supplier "${supplier.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/meta/suppliers/${supplier._id}`);
      fetchSuppliers();
    } catch (err: any) {
      alert(`Error deleting supplier: ${err.message}`);
    }
  };

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" variant="badge" className="shadow-xs shrink-0" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Suppliers & Vendors
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Stereobliss Retail — Directory of verified instrument distributors, manufacturers, and accessory vendors.
            </p>
          </div>
        </div>

        {canManageSuppliers() && (
          <Button
            size="sm"
            variant="default"
            onClick={handleOpenAdd}
            className="gap-1.5 text-xs font-bold"
          >
            <Plus className="h-4 w-4" />
            <span>Add Supplier</span>
          </Button>
        )}
      </div>

      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search suppliers by name or contact person..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <p className="col-span-full py-12 text-center text-slate-400">Loading suppliers...</p>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            <Building2 className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-medium">No suppliers registered yet.</p>
            <p className="text-xs text-slate-400 mt-0.5">Click &quot;Add Supplier&quot; to register your first supplier.</p>
          </div>
        ) : (
          filtered.map((s) => (
            <Card key={s._id} className="hover:border-amber-500/50 transition-all flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base text-slate-900 dark:text-white">{s.name}</CardTitle>
                      <p className="text-xs text-amber-500 font-semibold mt-0.5">
                        Contact: {s.contactPerson || 'General Support'}
                      </p>
                    </div>
                    <Badge variant="success" className="text-[10px]">
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  {s.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{s.phone}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{s.email}</span>
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{s.address}</span>
                    </div>
                  )}
                  {s.notes && (
                    <div className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
                      {s.notes}
                    </div>
                  )}
                </CardContent>
              </div>

              {(canManageSuppliers() || isSuperAdmin()) && (
                <div className="flex items-center justify-end gap-2 p-3 border-t border-slate-100 dark:border-slate-800">
                  {canManageSuppliers() && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(s)}
                      className="h-7 px-2.5 text-xs gap-1"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </Button>
                  )}
                  {isSuperAdmin() && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteSupplier(s)}
                      className="h-7 px-2.5 text-xs gap-1 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Remove</span>
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? `Edit Supplier — ${editingSupplier.name}` : 'Add New Supplier'}
        description="Register or update vendor contact and catalog details."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
              {formError}
            </div>
          )}

          <Input
            label="Supplier Company Name *"
            required
            placeholder="e.g. Furtados Music, Bajaao, Yamaha India"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Person"
              placeholder="e.g. David Vaz"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
            <Input
              label="Phone Number"
              placeholder="+91 98200 12345"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            placeholder="orders@vendor.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Office / Warehouse Address"
            placeholder="City, State"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Notes / Terms
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 15-day payment credit, authorized brand distributor"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" isLoading={isSaving} className="font-bold">
              {editingSupplier ? 'Save Changes' : 'Register Supplier'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
