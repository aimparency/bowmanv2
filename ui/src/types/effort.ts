interface Factors {
  [unit: string]: {
    code: number, 
    smallest: string | undefined,
    factors: {
      [unit: string]: number
    }, 
    beginning: string, 
    singular: string, 
    plural: string, 
  }
}

export default class Effort {
  static fulls = ['century', 'year', 'month', 'week', 'day', 'hour', 'minute', 'second']
  static plural = ['centuries', 'years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds']
  static unitInfos: Factors = {
    c: {
      code: 'c'.charCodeAt(0), 
      factors: {
        y: 100, 
      },
      smallest: 'y', 
      beginning: 'c', 
      singular: 'century', 
      plural: 'centuries'
    }, 
    y: {
      code: 'y'.charCodeAt(0), 
      factors: {
        o: 12, 
        w: 52, 
        d: 365, 
      },
      smallest: 'd', 
      beginning: 'y', 
      singular: 'year', 
      plural: 'years'
    }, 
    o: {
      code: 'o'.charCodeAt(0), 
      factors: {
        w: 4, 
        d: 30, 
      }, 
      smallest: 'd', 
      beginning: 'mo', 
      singular: 'month', 
      plural: 'months'
    }, 
    w: {
      code: 'w'.charCodeAt(0), 
      factors: {
        d: 7, 
      }, 
      smallest: 'd', 
      beginning: 'w', 
      singular: 'week', 
      plural: 'weeks'
    }, 
    d: {
      code: 'd'.charCodeAt(0), 
      factors: {
        h: 24
      }, 
      smallest: 'h', 
      beginning: 'd', 
      singular: 'day', 
      plural: 'days'
    }, 
    h: {
      code: 'h'.charCodeAt(0), 
      factors: {
        i: 60, 
      }, 
      smallest: 'i', 
      beginning: 'h', 
      singular: 'hour', 
      plural: 'hours'
    }, 
    i: {
      code: 'i'.charCodeAt(0), 
      factors: {
        s: 60, 
      }, 
      smallest: 's', 
      beginning: 'mi', 
      singular: 'minute', 
      plural: 'miuntes'
    }, 
    s: {
      code: 's'.charCodeAt(0), 
      factors: {
      }, 
      smallest: undefined, 
      beginning: 's', 
      singular: 'second', 
      plural: 'seconds' 
    }
  }  

  static fromString(s: string) : Effort {
    let smallestUnit = 'c'
    let efforts: Effort[] = []
    Object.keys(Effort.unitInfos).forEach(unitChar => {
      let unit = Effort.unitInfos[unitChar]
      let match = s.match(new RegExp('(\\d+\\.?\\d*)\\s*' + unit.beginning))
      if(match !== null) {
        let amount = parseFloat(match[1])
        efforts.push(new Effort(
          unitChar, 
          amount
        ))
        smallestUnit = unitChar
      }
    })
    let totalAmount = 0
    for(let effort of efforts) {
      effort.convert(smallestUnit) 
      totalAmount += effort.amount
    }
    return new Effort(
      smallestUnit, 
      totalAmount
    )
  }

  constructor(
    public unit: string,
    public amount: number
  ) {}

  static getConversionFactor(biggerUnit: string, smallerUnit: string) : null | number {
    let unitInfo = Effort.unitInfos[biggerUnit]
    let factor = unitInfo.factors[smallerUnit]
    if(factor) {
      return factor
    } else {
      let smallest = unitInfo.smallest
      if (smallest) {
        let factor1 = unitInfo.factors[smallest]
        let factor2 = Effort.getConversionFactor(smallest, smallerUnit)
        if(factor2) {
          return factor1 * factor2
        } else {
          return null
        }
      } else {
        return null
      }
    }  
  }

  convert(targetUnit: string) {
    let factor = Effort.getConversionFactor(this.unit, targetUnit)
    if(factor) {
      this.amount *= factor
      this.unit = targetUnit
    }
  }

  humanize() : string {
    let unitInfo = Effort.unitInfos[this.unit]
    return this.amount.toString() + " " + (
      this.amount == 1 ? unitInfo.singular : unitInfo.plural
    )
  }

  eq(other: Effort | undefined) : boolean {
    return other !== undefined && this.amount == other.amount && this.unit == other.unit
  }
}
