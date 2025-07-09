export function humanizeAmount(n: bigint) {
  let truncated = false
  let str = n.toString()
  let digits = str.length
  let zeros = 0
  while(str[digits - 1 - zeros] == "0") {
    zeros++
  }
  if(digits < 19) {
    str =  '0'.repeat(19 - digits) + str
  }
  if(zeros < 18) {
    let circa = "~" 
    let cutoff = 10 
    if(zeros >= 10) {
      cutoff = zeros 
      circa = ""
    }
    str = circa + str.slice(0,-18) + '.' +  str.slice(-18, -cutoff) 
  } else {
    str = str.slice(0,-18)
  }
  return str
}
