/**
 * Enum for different types of shipping addresses
 * Matches Amazon's address classification system
 */
export enum AddressType {
  /**
   * Home address
   * Typically used for personal deliveries
   */
  HOME = 'HOME',

  /**
   * Work address
   * Typically used for business deliveries
   */
  WORK = 'WORK',

  /**
   * Gift address
   * Used when shipping to a third party
   */
  GIFT = 'GIFT',

  /**
   * Business address
   * Used for commercial deliveries
   */
  BUSINESS = 'BUSINESS',

  /**
   * Other address
   * Used when the address doesn't fit into the other categories
   */
  OTHER = 'OTHER',
}
