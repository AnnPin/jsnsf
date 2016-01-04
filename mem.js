/** Manages memory, including various views and listeners. */
export default class Memory {
  constructor() {
    /** @private @const {!Array<number>} */
    this.data_ = [];
    for (let i = 0; i < 0x4000; i++) {
      this.data_[i] = 0;
    }
    /** @private @const {!Object<number, !Array<function()>>} */
    this.callbacks_ = {};
  }


  /**
   * @param {number} addr
   * @return {number}
   */
  get(addr) {
    const shift = (addr & 3) << 3;
    return (this.data_[addr >>> 2] >>> shift) & 0xff;
  }


  /**
   * @param {number} addr
   * @param {number} value
   */
  set(addr, value) {
    const shift = (addr & 3) << 3;
    const word = addr >>> 2;
    const mask = ~(0xff << shift);
    this.data_[word] = (this.data_[word] & mask) | ((value & 0xff) << shift);
    this.call_(addr);
  }


  /**
   * @param {number} addr
   * @private
   */
  call_(addr) {
    for (let cb of (this.callbacks_[addr] || [])) {
      cb();
    }
  }


  /**
   * @param {number} addr
   * @param {function()} callback
   */
  listen(addr, callback) {
    (this.callbacks_[addr] = this.callbacks_[addr] || []).push(callback);
  }


  /**
   * @param {number} addr
   * @param {number} shift
   * @param {number} length
   * @return {!Memory.Register<number>}
   */
  int(addr, shift, length) {
    if (length > 32) throw new Error('register max = 32 bits');
    if (shift > 8) {
      addr += shift >>> 3;
      shift = shift & 3;
    }
    const startWord = addr >>> 2;
    const endWord = (addr + ((shift + length - 1) >>> 3)) >> 2;
    const data = this.data_;
    if (startWord == endWord) {
      shift += (startWord & 3) << 3;
      const mask = makeMask(length) << shift;
      const call = this.call_.bind(this, startWord);
      return {
        get() {
          return (data[startWord] & mask) >>> shift;
        },
        set(value) {
          // TODO(sdh): check overflow of value and throw error?
          data[startWord] =
            (data[startWord] & ~mask) | ((value << shift) & mask);
          call();
        },
      };
    } else {
      throw new Error('unimplemented');
    }
  }


  /**
   * @param {number} addr
   * @param {number} bit
   * @return {!Memory.Register<boolean>}
   */
  bool(addr, bit) {
    const word = addr >>> 2;
    bit += (addr & 3) << 3;
    const mask = 1 << bit;
    return {
      get() {
        return !!(data[word] & mask);
      },
      set(value) {
        if (value) data[word] |= mask;
        else data[word] &= ~mask;
      },
    };
  }
}


/**
 * @param {number} length
 * @return {number}
 */
function makeMask(length) {
  let mask = 0;
  while (length--) mask = (mask << 1) | 1;
  return mask;
}


/**
 * @record
 * @template T
 */
Memory.Register = class {
  /** @return {T} */
  get() {}
  /** @param {T} value */
  set(value) {}
};
