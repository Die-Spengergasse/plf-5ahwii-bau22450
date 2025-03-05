"use strict";
class Code {
    constructor(parent) {
        this.parent = parent;
        this.domObj = document.createElement("div");
        this.domObj.classList.add("row");
        this.domObj.obj = this;
        this.colorArray = [];
        this.visible = true;
        this.isBewerted = false;

        for (let i = 1; i <= 4; i++) {
            const col = new Color(this, i);
            this.domObj.appendChild(col.domObj);
            this.colorArray.push(col);
        }
    }
    getPrimitive() {
        return this.colorArray.map((c) => c.currentValue);
    }
}

class Master extends Code {
    constructor(parent) {
        super(parent);

        let btn = document.createElement("button");
        btn.obj = this;
        btn.classList.add("neuSpiel");
        btn.innerHTML = "Neues\nSpiel";
        btn.addEventListener("click", (e) => e.target.obj.parent.newGame());
        this.domObj.appendChild(btn);

        btn = document.createElement("button");
        btn.obj = this;
        btn.classList.add("visible");
        btn.innerText = "Zeig\nher";
        btn.addEventListener("click", (e) => {
            e.target.obj.toggleVisibility();
            e.target.innerText = e.target.obj.visible
                ? "Ver-\nsteck"
                : "Zeig\nher";
        });
        this.domObj.appendChild(btn);

        this.shuffle();
        this.makeVisible(false);
    }

    getPossibilities() {
        const res = [];
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 6; j++) {
                for (let k = 0; k < 6; k++) {
                    for (let l = 0; l < 6; l++) {
                        res.push([i, j, k, l]);
                    }
                }
            }
        }
        return res;
    }

    shuffle() {
        this.colorArray.forEach((c) => c.randomize());
    }

    makeVisible(visible) {
        this.visible = visible;
        this.colorArray.forEach((c) => c.updateDisplay(visible));
    }

    toggleVisibility() {
        this.makeVisible(!this.visible);
    }
}

class Guess extends Code {
    constructor(parent, possibilities) {
        super(parent);
        this.bewertePegs = [];
        this.bewertung = null;
        this.possibilitiesInherited = possibilities;

        parent.notify(
            possibilities.length == 1
                ? "Ich kenne die richtige Lösung ;)"
                : `Neuer Versuch, ${possibilities.length} gültige Möglichkeiten`,
        );

        let btn = document.createElement("button");
        btn.obj = this;
        btn.classList.add("bewerte");
        btn.innerText = "Bewerten";
        btn.addEventListener("click", (e) => e.target.obj.bewerte());
        this.domObj.appendChild(btn);

        btn = document.createElement("button");
        btn.obj = this;
        btn.classList.add("autoGuess");
        btn.innerHTML = "Auto Rate";
        btn.addEventListener("click", (e) => e.target.obj.autoGuess());
        this.domObj.appendChild(btn);

        for (let i = 1; i <= 4; i++) {
            const peg = new BewertePeg(this, i);
            this.bewertePegs.push(peg);
            this.domObj.appendChild(peg.domObj);
        }
    }

    isComplete() {
        return this.colorArray.every((c) => c.isUpdated);
    }

    bewerte(master = null) {
        if (!this.isComplete()) {
            this.parent.notify("Code ist nicht fertig, kann nicht bewerten");
            return;
        }

        master = master || this.parent.master.getPrimitive();
        this.bewertung = this.getBewertung(master, this.getPrimitive());
        this.parent.notify(
            `Bewertung: ${this.bewertung[0]} schwarze und ${
                this.bewertung[1]
            } weisse`,
        );

        let bewCount = 1;
        for (let i = 0; i < this.bewertung[0]; i++) {
            this.domObj.getElementsByClassName(`b${bewCount++}`)[0].style
                .backgroundColor = "#000";
        }
        for (let i = 0; i < this.bewertung[1]; i++) {
            this.domObj.getElementsByClassName(`b${bewCount++}`)[0].style
                .backgroundColor = "#fff";
        }
        for (; bewCount <= 4; bewCount++) {
            this.domObj.getElementsByClassName(`b${bewCount}`)[0].style
                .backgroundColor = "#888";
        }

        if (!this.isBewerted) {
            (this.bewertung[0] < 4)
                ? this.parent.prependGuess()
                : this.parent.prependWin();
        } else {
            this.parent.notify("Ist schon bewertet!");
        }
        this.isBewerted = true;
    }

    getPossibilities() {
        const guess = this.getPrimitive();
        return this.possibilitiesInherited.filter((p) =>
            this.arraysEqual(this.getBewertung(p, guess), this.bewertung)
        );
    }

    arraysEqual(a, b) {
        return a.length === b.length && a.every((v, i) => v == b[i]);
    }

    getBewertung(parMaster, parGuess) {
        const master = Array.from(parMaster);
        const guess = Array.from(parGuess);
        let schwarze = 0, weisse = 0;

        for (let i = 0; i < guess.length; i++) {
            if (master[i] == guess[i]) {
                schwarze++;
                master[i] = guess[i] = undefined;
            }
        }

        for (let i = 0; i < guess.length; i++) {
            if (guess[i] === undefined) continue;

            for (let j = 0; j < master.length; j++) {
                if (master[j] == guess[i]) {
                    weisse++;
                    master[j] = guess[i] = undefined;
                    break;
                }
            }
        }
        return [schwarze, weisse];
    }

    autoGuess() {
        const bestArray = this.getBestArray(this.possibilitiesInherited);
        this.updateSelf(
            bestArray[Math.floor(Math.random() * bestArray.length)],
        );
    }

    updateSelf(guess) {
        for (let i = 0; i < 4; i++) this.colorArray[i].setInt(guess[i]);
    }

    getBestArray(arr) {
        const dict = new DiversityMap();
        for (const g of arr) {
            const div = this.getDiversity(g);
            if (!dict.has(div)) dict.set(div, []);
            dict.get(div).push(g);
        }
        return dict.getMostDiverseArray();
    }

    getDiversity(arr) {
        return [...new Set(arr)].length;
    }
}

class DiversityMap extends Map {
    getFullestArray() {
        let max = 0, res;
        for (const k of this.keys()) {
            if (this.get(k).length > max) {
                max = this.get(k).length;
                res = this.get(k);
            }
        }
        return res;
    }

    getMostDiverseArray() {
        return this.get(Math.max(...this.keys()));
    }
}

class BewertePeg {
    constructor(parent, i) {
        this.parent = parent;
        this.domObj = document.createElement("div");
        this.domObj.classList.add("circle", "bew", `b${i}`);
    }
}

class RowWin {
    constructor(parent) {
        this.parent = parent;
        this.domObj = document.createElement("div");
        this.domObj.classList.add("row");
        const win = document.createElement("div");
        win.classList.add("win");
        win.innerHTML = "Gewonnen!";
        this.domObj.appendChild(win);
    }
}
