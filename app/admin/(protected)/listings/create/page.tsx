import {
  AdminPageHeader,
  AdminPanel,
} from "@/features/admin/components/admin-ui";
import { AdminDemoListingForm } from "@/features/admin/components/admin-demo-listing-form";

export default function AdminCreateListingPage() {
  return (
    <AdminPanel className="space-y-6">
      <AdminPageHeader
        eyebrow="Marketplace"
        title="Создание объявления"
        description="Создай витринный букет от demo-продавца. Покупатель увидит обычную карточку и имя продавца."
      />
      <AdminDemoListingForm />
    </AdminPanel>
  );
}
