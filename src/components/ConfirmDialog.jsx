function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.2)]">
        <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500">Confirmación</p>
        <h3 className="mt-2 text-2xl font-medium text-stone-950">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-stone-600">{message}</p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-full border border-stone-300 px-4 py-3 text-xs font-bold uppercase tracking-[0.28em] text-stone-700 transition hover:border-stone-950 hover:text-stone-950 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-full bg-red-600 px-4 py-3 text-xs font-bold uppercase tracking-[0.28em] text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;