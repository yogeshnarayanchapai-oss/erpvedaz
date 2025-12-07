import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCreateStore, useUpdateStore, type Store, type CreateStoreInput } from '@/hooks/useStores';

interface StoreFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store?: Store;
}

export function StoreFormDialog({ open, onOpenChange, store }: StoreFormDialogProps) {
  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const isEdit = !!store;

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<CreateStoreInput>({
    defaultValues: {
      name: '',
      slug: '',
      default_subdomain: '',
      logo_url: '',
      primary_color: '#008060',
      contact_email: '',
      contact_phone: '',
      address: '',
      is_active: true,
    },
  });

  const name = watch('name');

  useEffect(() => {
    if (store) {
      reset({
        name: store.name,
        slug: store.slug,
        default_subdomain: store.default_subdomain || '',
        logo_url: store.logo_url || '',
        primary_color: store.primary_color,
        contact_email: store.contact_email || '',
        contact_phone: store.contact_phone || '',
        address: store.address || '',
        is_active: store.is_active,
      });
    }
  }, [store, reset]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!isEdit && name) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setValue('slug', slug);
      setValue('default_subdomain', slug);
    }
  }, [name, isEdit, setValue]);

  const onSubmit = async (data: CreateStoreInput) => {
    if (isEdit) {
      await updateStore.mutateAsync({ id: store.id, ...data });
    } else {
      await createStore.mutateAsync(data);
    }
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Store' : 'Create New Store'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Store Name *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Store name is required' })}
                placeholder="e.g., Vakari Vision"
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                {...register('slug', { required: 'Slug is required' })}
                placeholder="vakari-vision"
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL-friendly identifier
              </p>
              {errors.slug && (
                <p className="text-sm text-destructive mt-1">{errors.slug.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="default_subdomain">Default Subdomain</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="default_subdomain"
                  {...register('default_subdomain')}
                  placeholder="vakari"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  .vakari.store
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Optional subdomain
              </p>
            </div>

            <div>
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                {...register('logo_url')}
                placeholder="https://..."
                type="url"
              />
            </div>

            <div>
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  {...register('primary_color')}
                  type="color"
                  className="w-20"
                />
                <Input
                  {...register('primary_color')}
                  placeholder="#008060"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                {...register('contact_email')}
                placeholder="contact@vakari.com"
                type="email"
              />
            </div>

            <div>
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                {...register('contact_phone')}
                placeholder="+977 9801234567"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                {...register('address')}
                placeholder="Store address..."
                rows={3}
              />
            </div>

            <div className="col-span-2 flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(checked) => setValue('is_active', checked)}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Store is active
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createStore.isPending || updateStore.isPending}
            >
              {createStore.isPending || updateStore.isPending
                ? 'Saving...'
                : isEdit
                ? 'Update Store'
                : 'Create Store'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
