type NostalgiaVersions = 'First' | 'Forte' | 'Op2' | 'Op3'
type NostalgiaNumericTypes = 'music_index' | 'sheet_type' | 'brooch_index' | 'event_index'

export class NosVersionHelper {
    public version: NostalgiaVersions

    private table = { // FIXME: All of Op3 values are placeholder
        music_index:  { First: 87, Forte: 195, Op2: 315, Op3: 500 },
        brooch_index: { First: 120, Forte: 147, Op2: 148, Op3: 200 },
        sheet_type:   { First: 2, Forte: 2, Op2: 3, Op3: 3 },
        event_index:  { First: 10, Forte: 10, Op2: 17, Op3: 20  }
    }

    constructor (info: EamuseInfo) {
        const version = parseInt(info.model.trim().substr(10), 10)
        if (version >= 2020000000) {
            this.version = 'Op3'
        } else if (version >= 2019000000) {
            this.version = 'Op2'
        } else if (version >= 2018000000) {
            this.version = 'Forte'
        } else {
            this.version = 'First'
        }
    }


    getMusicMaxIndex() {
        return this.table['music_index'][this.version]
    }

    getBroochMaxIndex() {
        return this.table['brooch_index'][this.version]
    }

    getEventMaxIndex() {
        return this.table['event_index'][this.version]
    }

    numericHandler(type: NostalgiaNumericTypes, input: number, def: number = 0) {
            return input > this.table[type][this.version] ? def : input;
    }

    isFirstOrForte() {
        return this.version === 'First' || this.version === 'Forte'
    }
}