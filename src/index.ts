import { BehaviorSubject, Observable, combineLatest, Subscription, TeardownLogic, isObservable, of } from 'rxjs';
import { map, shareReplay, distinctUntilChanged } from 'rxjs/operators';
import { isEqual } from 'lodash';


//
// ─── SGLOBAL ────────────────────────────────────────────────────────────────────
//

export type Observablize<T> = { [P in keyof T]: Observable<T[P]> | T[P]; };


export function SGlobal<T>(value: Observablize<T>): Observablize<T> {
    let newval: any = {};
    for (const key in value) {
        if (value.hasOwnProperty(key)) {
            const element = value[key];
            if (isObservable(element)) newval[key] = element;
            else newval[key] = of(element);
        }
    }
    return newval;
}

//
// ─── SLOCAL ─────────────────────────────────────────────────────────────────────
//

export interface Portion<C> {
    asObservable: () => Observable<C>,
    value: () => C,
    next: (value: C) => void
}

export class SLocal<T> extends BehaviorSubject<T> {

    constructor(initialValue?: Partial<T>) {
        super(<T>initialValue ?? <T>{})
    }

    patch(value: Partial<T> | ((s: T) => Partial<T>)) {
        const patching = (value) =>
            this.next({ ...this.getValue(), ...value });

        if (typeof (value) == 'function') {
            patching(value(this.getValue()))
        } else patching(value)
    }

    setState(value: T | ((s: T) => T)) {
        if (typeof (value) == 'function') {
            this.next((<any>value)(this.getValue()));
        } else this.next(value)
    }

    portion<K extends keyof T>(key: K) {
        return {
            asObservable: () => {
                return this.pipe(
                    map(v => v?.[key]),
                    distinctUntilChanged(isEqual)
                );
            },
            value: () => {
                return this.getValue()[key];
            },
            next: (value: T[K]) => {
                this.patch({ [key]: value } as Record<K, T[K]> as Partial<T>);
            }
        } as Portion<T[K]>
    }
}

//
// ─── SCOMBINED ──────────────────────────────────────────────────────────────────
//

export function SCombined<G, L>(
    glob: Observablize<G>,
    loc: SLocal<L> = new SLocal({} as L)
): Observable<G & L> {

    const gl = (Object.keys(glob)?.length)
        ? combineLatestObject(glob)
        : of({} as Observablize<G>);

    const lc = loc.asObservable();

    return combineLatest(gl, lc)
        .pipe(
            map(([g, l]) => ({ ...g, ...l })),
            shareReplay(1)
        ) as Observable<G & L>;
}

function combineLatestObject<T>(object: Observablize<T>): Observable<T> {

    function ObservablizeObjectToArray(obj: Observablize<any>): Observable<any>[] {
        return Object.keys(obj)
            .map((key: string) => {
                let value = obj[key];
                return value.pipe(map(v => ({ [key]: v })))
            })
    }

    const arr = ObservablizeObjectToArray(object);
    return combineLatest(arr).pipe(map(arr => { return Object.assign({}, ...arr) }))
}

//
// ─── SUBBUCKET ──────────────────────────────────────────────────────────────────
//

export class SubsBucket extends Subscription {
    constructor() {
        super();
    }

    set push(teardown: TeardownLogic) {
        this.add(teardown);
    }
}