# ngc-stater

This Library help to manage state on the component level In Angular. 

`npm install ngc-stater`

## Why use this?
1. Reactivity
2. Code readabilty
3. Makes complex state simpler
4. Type check and auto complate

## Concept

We divide the state into 3 parts
1. the local state - the one that change in the code over the time.
2. the global state - the one that come from server, and can change only indirecty over the time.
3. A combined observable of both the local and the global.

## SLocal
The local state, it is possible to inital it at the declaration or later or even partialy initalize it with some of the value.

```
interface ISLocal {
    name: string,
    age: number,
}

const local$ = new SLocal<ISLocal>({
    name: 'Alice',
    age: 25
});
```

### Setting and Patching state

When you want to update the state you can use setState or patch.

setState can get full state object or function that get the current state and return the new state.

patch can get partial state object or function that get the current state and return the partial state.

patch will add the new state to the last one, and replace older values if exist.

`local$.patch(s => ({ age: s.age + 5}))` - will add 5 to the state

`local$.patch(s => ({ name: 'Bob' , age: 40 }))` - will replace the name and the age

`local$.patch({ name: 'Bob' , age: 40 })` - also posible to insert value and not function


### Portion

When you want to take only a portion from the state as observable.
portion take

`prName = local$.portion('name');`

you can update the state by using the next funtion on the portion.

`prName.next('Jacob')` - will change the name state to jacob

you can get the observable value by asObservable() function

```
prName.asObservable().subscribe(console.log);

LOG Jacob at subscription time

local$.patch({ name: 'Sarha' }) 

LOG SARHA

local$.patch({age: 30})

LOG NOTHING BECAUSE THE NAME WASN'T CHANGED

`prName.next('Lev')`

LOG Lev
```

you can subscribe to the SLocal and get the observable of the value

Using SGlobal is not mandatory and it's possible to use only the SLocal.

### Getting the current SLocal value as raw value

using the getValue() function onn local$ will return the raw value of the current local state

In portion there is value() function to get the raw value of the portion


### SGobal


the global state is the state that come from the server and doesn't change directly.

you can't patch it or set it and you must initialize in on the declaration time.

```

interface Book {
    name: string,
    pages: number
}

interface ISGlobal {
    romansBooks: Observable<Book[]>
    actionBooks: Observable<Book[]>
}

const glob$ = SGlobal<ISGlobal>({
    romansBooks: of([{
        name: 'Generic roman',
        pages: 500
    }]),
    actionBooks: this.http.get('some url')
});

```

the SGlobal function gets an object of observables.
for each key there is an observable value of the key

## Change SGlobal indirectly

you can change the SGlobal indirectly by BehaviourSubject or a Portion.

for example let's say that we want to have in the global state a list of actionBooks with the name of alice,
and we also have a server api that know to return those (simulate by getBuuksFromServer function.

We can start with empty name in the local state and update the actionBooks later when we update the name.

This can be useful if we want to filter some data from the server.

```
const local$ = new SLocal();

prName = local$.portion('name');

const glob$ = SGlobal<ISGlobal>({
    romansBooks: of([{
        name: 'Generic roman',
        pages: 500
    }]),
    actionBooks: prName.asObservable()
        .pipe(switchMap(v => getBooksFromServer(v)))
});

function getBooksFromServer(name: string): Observable<Book[]> {
    // Stimulate server call that retur nall the books with the name
    if (!filter) return of([]);
    return of([{
        name: 'Alice in wonderland',
        pages: 450
    }]).pipe(delay(2000))
}

```

YOU CAN'T SUBSCRIBE TO SGLOBAL DIRECTLY ONLY BY SCOMBINED


### SCombined

SCombined function get global state and optionaly local state and combined them to a single observable so whenever one of the value changed the obsesrvable emit new value

`const combined$ = SCombined<ISGlobal, ISLocal>(glob$, local$);`

The signiture of combined$ is `Observable<ISGlobal & ISLocal>`

you can subscribe to combined$ with async pipe or regular subscribe and getting the last data from the local and global states


for example:

```
interface Book {
    name: string,
    pages: number
}

interface ISGlobal {
    romansBooks: Observable<Book[]>
    actionBooks: Observable<Book[]>
}

interface ISLocal {
    name: string,
    age: number,
}

const local$ = new SLocal<ISLocal>({
    name: 'Alice',
    age: 25
});


const glob$ = SGlobal<ISGlobal>({
    romansBooks: [{
        name: 'Generic roman',
        pages: 500
    }], // You can also use raw value - it's like const or final value on the combined at the end
    actionBooks: this.http.get('some url')
});

const combined$ = SCombined<ISGlobal, ISLocal>(glob$, local$);

combined$.subscribe(console.log);

LOG {
    name: 'Alice',
    age: 25,
    romansBook: ROMANBOOKS VALUE HERE,
    actionBooks: ACTIONSBOOKS VALUE HERE,
}

setTimeout(() => {
    local$.patch({
        age: 35,
        name: 'Bob'
    })
}, 2000);

LOG AFTER 2 SEC {
    name: 'Bob',
    age: 35,
    romansBook: ROMANBOOKS VALUE HERE,
    actionBooks: ACTIONSBOOKS VALUE HERE,
}

ALSO LOG THE NEW VALUE EVERY TIME THAT ANY PORION EMIT OT ANY ONE ON THE GLOBAL VALUE OBSERVABLES EMIT NEW VALUE
```