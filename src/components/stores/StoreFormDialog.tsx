import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, User } from 'lucide-react';
import { useCreateStore, useUpdateStore, type Store, type CreateStoreInput } from '@/hooks/useStores';
import { getStoreDisplayUrl } from '@/lib/storeSubdomain';

interface StoreFormData extends CreateStoreInput {
  admin_name?: string;
  admin_email?: string;
}

interface StoreFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store?: Store;
}

export function StoreFormDialog({ open, onOpenChange, store }: StoreFormDialogProps) {
  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const isEdit = !!store;

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<StoreFormData>({
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
      admin_name: '',
      admin_email: '',
    },
  });

  const name = watch('name');
  const subdomain = watch('default_subdomain');

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
        admin_name: '',
        admin_email: '',
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

  const onSubmit = async (data: StoreFormData) => {
    const { admin_name, admin_email, ...storeData } = data;
    
    if (isEdit) {
      await updateStore.mutateAsync({ id: store.id, ...storeData });
    } else {
      await createStore.mutateAsync({
        ...storeData,
        admin_name,
        admin_email,
      } as any);
    }
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Store' : 'Create New Store'}</DialogTitle>
          <DialogDescription>
            {isEdit 
              ? 'Update store details and settings'
              : 'Create a new store with its own admin and subdomain'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Store Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Store Name *</Label>
                <Input
                  id="name"
                  {...register('name', { required: 'Store name is required' })}
                  placeholder="e.g., My Awesome Store"
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
                  placeholder="my-awesome-store"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  URL-friendly identifier
                </p>
                {errors.slug && (
                  <p className="text-sm text-destructive mt-1">{errors.slug.message}</p>
                )}
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
            </div>
          </div>

          {/* Store Path Section */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Store URL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="default_subdomain">Store Path</Label>
                <div className="flex items-center gap-0 mt-1">
                  <div className="bg-muted px-3 py-2 border border-input rounded-l-md text-sm font-medium text-muted-foreground whitespace-nowrap">
                    {window.location.host}/
                  </div>
                  <Input
                    id="default_subdomain"
                    {...register('default_subdomain')}
                    placeholder="storename"
                    className="rounded-l-none border-l-0"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your store will be accessible at this unique URL path
                </p>
              </div>
              
              {subdomain && (
                <div className="bg-background rounded-md p-3 border">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Store URL: </span>
                    <span className="font-medium text-primary">
                      {getStoreDisplayUrl(subdomain)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Admin: {getStoreDisplayUrl(subdomain)}/admin
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin User Section - Only show for new stores */}
          {!isEdit && (
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Store Admin (Auto-Created)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  An admin user will be automatically created for this store with full access
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="admin_name">Admin Name *</Label>
                    <Input
                      id="admin_name"
                      {...register('admin_name', { 
                        required: !isEdit ? 'Admin name is required' : false 
                      })}
                      placeholder="John Doe"
                    />
                    {errors.admin_name && (
                      <p className="text-sm text-destructive mt-1">{errors.admin_name.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="admin_email">Admin Email *</Label>
                    <Input
                      id="admin_email"
                      {...register('admin_email', { 
                        required: !isEdit ? 'Admin email is required' : false,
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address'
                        }
                      })}
                      placeholder="admin@example.com"
                      type="email"
                    />
                    {errors.admin_email && (
                      <p className="text-sm text-destructive mt-1">{errors.admin_email.message}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  A temporary password will be generated. The admin will receive login credentials via email.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Additional Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  {...register('contact_email')}
                  placeholder="contact@store.com"
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
                  rows={2}
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
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
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
                : 'Create Store & Admin'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}