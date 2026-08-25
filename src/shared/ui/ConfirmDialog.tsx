import { Modal } from "./Modal";
import { useT } from "../../lib/i18n/LocalizationProvider";

export function ConfirmDialog({
  message,
  onCancel,
  onConfirm,
  title
}: { message: string; onCancel: () => void; onConfirm: () => void; title: string }) {
  const { t } = useT();
  return (
    <Modal title={title} onClose={onCancel}>
      <p>{message}</p>
      <div className="modal-actions">
        <button className="icon-button" onClick={onCancel}>{t("common.cancel")}</button>
        <button className="primary-button danger" onClick={onConfirm}>{t("common.delete")}</button>
      </div>
    </Modal>
  );
}
