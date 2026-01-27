
import { RefPermission } from '../models/RefPermission';

const PERMISSIONS = [
  // Admin Management
  { name: 'admin.view', label: 'View Admins', comment: 'View list of admins' },
  { name: 'admin.manage', label: 'Manage Admins', comment: 'Create, Edit, Delete admins' },
  { name: 'admin.permissions', label: 'Manage Permissions', comment: 'Grant or revoke access rights' },
  { name: 'audit_log.view', label: 'View Audit Logs', comment: 'View system audit logs' },

  // Customer Management
  { name: 'customer.view', label: 'View Customers', comment: 'View list of customers' },
  { name: 'customer.manage', label: 'Manage Customers', comment: 'Edit customer details' },
  { name: 'customer.approve', label: 'Approve Customers (General)', comment: 'Approve general customer onboarding' },
  { name: 'customer.controlled.approve', label: 'Approve Customers (Controlled)', comment: 'Approve customer for controlled item purchases (Regulatory)' },

  // Vendor Management
  { name: 'vendor.view', label: 'View Vendors', comment: 'View list of vendors' },
  { name: 'vendor.manage', label: 'Manage Vendors', comment: 'Edit vendor details' },
  { name: 'vendor.approve', label: 'Approve Vendors (General)', comment: 'Approve vendor for General products' },
  { name: 'vendor.controlled.approve', label: 'Approve Vendors (Controlled)', comment: 'Approve vendor for Controlled products (Regulatory)' },

  // Product Management
  { name: 'product.view', label: 'View Products', comment: 'View all products' },
  { name: 'product.manage', label: 'Manage Products', comment: 'Create, Edit, Delete (Admin) products' },
  { name: 'product.approve', label: 'Approve Products (General)', comment: 'Approve General products' },
  { name: 'product.controlled.approve', label: 'Approve Products (Controlled)', comment: 'Approve Controlled products' },
  { name: 'attribute.manage', label: 'Manage Attributes', comment: 'Manage product attributes (dynamic attributes)' },

  // Order Management
  { name: 'order.view', label: 'View Orders', comment: 'View all orders' },
  { name: 'order.manage', label: 'Manage Orders', comment: 'Process orders, update status' },
  { name: 'order.approve', label: 'Approve Orders (General)', comment: 'General Order processing approval' },
  { name: 'order.controlled.approve', label: 'Approve Orders (Controlled)', comment: 'Approval for orders containing controlled items' },

  // Financials
  { name: 'payout.view', label: 'View Payouts', comment: 'View payout requests' },
  { name: 'payout.manage', label: 'Manage Payouts', comment: 'Process/Approve payout requests' },
  { name: 'wallet.view', label: 'View Wallets', comment: 'View wallet transactions' },
  { name: 'wallet.manage', label: 'Manage Wallets', comment: 'Adjust wallet balances' },

  // Settings & Content
  { name: 'category.manage', label: 'Manage Categories', comment: 'Manage product categories' },
  { name: 'reference.manage', label: 'Manage References', comment: 'Manage reference data (colors, countries, etc.)' },
  { name: 'content.manage', label: 'Manage Content', comment: 'Manage frontend content (banners, sliders)' },
  { name: 'settings.manage', label: 'System Settings', comment: 'Manage global platform settings' },
];

export async function seedPermissions() {
  console.log('🔒 Seeding Permissions...');
  
  for (const perm of PERMISSIONS) {
    const [permission, created] = await RefPermission.findOrCreate({
      where: { name: perm.name },
      defaults: {
        name: perm.name,
        label: perm.label,
        comment: perm.comment,
      },
      paranoid: false, // Include soft-deleted ones in check
    });

    if (!created) {
        // Update comment/label if changed, or restore if deleted
        if (permission.deleted_at) {
             await permission.restore();
             console.log(`  Restored permission: ${perm.name}`);
        }
        
        let changed = false;
        if (permission.comment !== perm.comment) {
            permission.comment = perm.comment;
            changed = true;
        }
        if (permission.label !== perm.label) {
             permission.label = perm.label;
             changed = true;
        }

        if (changed) {
            await permission.save();
            console.log(`  Updated permission info: ${perm.name}`);
        }
    } else {
        console.log(`  Created permission: ${perm.name}`);
    }
  }
}
