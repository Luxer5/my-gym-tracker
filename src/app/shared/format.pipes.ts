import { Pipe, PipeTransform } from '@angular/core';
import {
  fmtDelta,
  fmtDmy,
  fmtDuration,
  fmtGap,
  fmtPace,
  fmtSplit500,
  fmtTime,
} from '../domain/format';

/** 2026-10-07 → 07/10/2026 */
@Pipe({ name: 'fdmy' })
export class FmtDmyPipe implements PipeTransform {
  transform(iso: string | null | undefined): string {
    return fmtDmy(iso);
  }
}

/** Segundos → mm:ss */
@Pipe({ name: 'mmss' })
export class FmtTimePipe implements PipeTransform {
  transform(totalSec: number | null | undefined): string {
    return totalSec == null ? '' : fmtTime(totalSec);
  }
}

/** Segundos → 1:21:15 (mm:ss por debajo de una hora) */
@Pipe({ name: 'dur' })
export class FmtDurationPipe implements PipeTransform {
  transform(sec: number | null | undefined): string {
    return sec == null ? '' : fmtDuration(sec);
  }
}

/** Diferencia con signo: −0:12 / +1:05 */
@Pipe({ name: 'delta' })
export class FmtDeltaPipe implements PipeTransform {
  transform(sec: number | null | undefined): string {
    return sec == null ? '' : fmtDelta(sec);
  }
}

/** Diferencia en palabras: «1:50 más rápido» / «2:55 más lento» */
@Pipe({ name: 'gap' })
export class FmtGapPipe implements PipeTransform {
  transform(sec: number | null | undefined): string {
    return sec == null ? '' : fmtGap(sec);
  }
}

/** Segundos por 500 m → 1:54 /500 m */
@Pipe({ name: 'split500' })
export class FmtSplit500Pipe implements PipeTransform {
  transform(sec: number | null | undefined): string {
    return sec == null ? '' : fmtSplit500(sec);
  }
}

/** Segundos por km → 4:31 /km */
@Pipe({ name: 'pace' })
export class FmtPacePipe implements PipeTransform {
  transform(sec: number | null | undefined): string {
    return sec == null ? '' : fmtPace(sec);
  }
}

export const FORMAT_PIPES = [
  FmtDmyPipe,
  FmtTimePipe,
  FmtDurationPipe,
  FmtDeltaPipe,
  FmtGapPipe,
  FmtPacePipe,
  FmtSplit500Pipe,
] as const;
