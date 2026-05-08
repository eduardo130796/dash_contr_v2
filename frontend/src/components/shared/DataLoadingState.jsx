import React from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

export function LoadingOverlay({ message = 'Loading contract data…' }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
      <Loader2 className="w-7 h-7 animate-spin text-primary" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
      <AlertTriangle className="w-7 h-7 text-destructive" />
      <p className="text-sm font-medium text-destructive">Failed to load data</p>
      <p className="text-xs text-muted-foreground max-w-sm text-center">{message}</p>
    </div>
  );
}