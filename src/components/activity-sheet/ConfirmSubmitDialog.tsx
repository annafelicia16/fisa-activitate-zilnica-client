import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { KPI } from "@/components/common/KPI"
import { MONTHS_RO } from "@/utils/dates"
import type { MonthAggregate } from "@/api/types"

interface ConfirmSubmitDialogProps {
  open: boolean
  year: number
  month: number
  summary: MonthAggregate
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmSubmitDialog({
  open,
  year,
  month,
  summary,
  loading,
  onConfirm,
  onClose,
}: ConfirmSubmitDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Trimite fișa pentru ${MONTHS_RO[month]} ${year} spre aprobare`}
      description="După trimitere, luna va fi blocată pentru editare până la decizia șefului de departament."
      footer={
        <>
          <Button variant="default" onClick={onClose} disabled={loading}>
            Anulează
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={loading}>
            {loading ? "Se trimite…" : "Trimite"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-3 overflow-hidden rounded-[--r-md] border border-border">
        <KPI label="NB" value={summary.nb} unit="ore conv." />
        <KPI label="PO" value={summary.po} unit="ore conv." separator />
        <KPI label="Total" value={summary.total} unit="ore" separator accent />
      </div>
      <p className="mt-3 text-[12px] text-text-muted">
        {summary.records} înregistrări incluse · această acțiune notifică șeful de departament.
      </p>
    </Dialog>
  )
}
