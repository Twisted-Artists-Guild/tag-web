/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/
"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ShoppingCart, Trash2 } from "lucide-react"
import { CART_PANEL_ID, useLayout } from "./LayoutProvider"
import { useCart } from "@/components/cart/CartContext"
import { useEntityImage } from "@/hooks/useEntityProfileImage"

const formatMoney = (value) => `$${(Number.isFinite(value) ? value : 0).toFixed(2)}`

function CartItem({ item, updateQuantity, removeFromCart, onNavigate }) {
  const listing = item.listing || {}
  const listingId = item.listingId || listing.listingID || listing.listingid || listing.id
  const [resolvedLink, setResolvedLink] = useState(null)
  const profileImage = useEntityImage("listing", listingId, "profile")
  const title = listing.title || listing.titleID || "Unknown item"
  const artist = listing.artist?.title || listing.vendor?.title || ""
  const price = Number(listing.price)
  const unitPrice = Number.isFinite(price) ? price : 0
  const quantity = Number(item.quantity) || 1
  const imageUrl = profileImage || listing.profilePic?.url || listing.profilePic?.URL || listing.defaultImageURL || listing.pictures?.[0]?.url || "/blank_image.png"
  const knownListingPath = listing.artist?.path && listing.path
    ? `/artists/${encodeURIComponent(listing.artist.path)}/listings/${encodeURIComponent(listing.path)}`
    : ""
  const listingPath = knownListingPath || (resolvedLink?.listingId === listingId ? resolvedLink.path : "")

  useEffect(() => {
    if (knownListingPath || !listingId) return undefined

    const controller = new AbortController()
    const resolveListingLink = async () => {
      try {
        const response = await fetch(`/api/listing/byID/${encodeURIComponent(listingId)}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`Listing lookup failed: ${response.status}`)
        const details = await response.json()
        if (!details.artist?.path || !details.path) throw new Error("Listing URL paths are missing")
        if (!controller.signal.aborted) {
          setResolvedLink({
            listingId,
            path: `/artists/${encodeURIComponent(details.artist.path)}/listings/${encodeURIComponent(details.path)}`,
          })
        }
      } catch (error) {
        if (!controller.signal.aborted) console.error(`Failed to load cart listing link for ${listingId}`, error)
      }
    }

    resolveListingLink()
    return () => controller.abort()
  }, [knownListingPath, listingId])

  return (
    <li className="tag-cart__item">
      <Image src={imageUrl} alt="" width={64} height={64} unoptimized className="tag-cart__image" />
      <div className="tag-cart__meta">
        <strong title={title}>
          {listingPath ? <Link href={listingPath} className="link" onClick={onNavigate}>{title}</Link> : title}
        </strong>
        {artist ? <span title={artist}>{artist}</span> : null}
        <div className="tag-cart__stepper" role="group" aria-label={`Quantity of ${title}`}>
          <button type="button" aria-label={`Decrease quantity of ${title}`} onClick={() => updateQuantity(item.listingId, quantity - 1)}>−</button>
          <output aria-live="polite">{quantity}</output>
          <button type="button" aria-label={`Increase quantity of ${title}`} onClick={() => updateQuantity(item.listingId, quantity + 1)}>+</button>
        </div>
      </div>
      <div className="tag-cart__right">
        <b>{formatMoney(unitPrice * quantity)}</b>
        <button type="button" className="tag-row__action" aria-label={`Remove ${title}`} title="Remove from cart" onClick={() => removeFromCart(item.listingId)}>
          <Trash2 aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}

/** Cart panel: items with a quantity stepper, totals and checkout, or an empty state. */
export default function RightSidebar() {
  const { isRightSidebarVisible, toggleRightSidebar } = useLayout()
  const { cartItems, cartTotal, cartCount, updateQuantity, removeFromCart } = useCart()

  const items = Array.isArray(cartItems) ? cartItems : []
  const total = Number.isFinite(cartTotal) ? cartTotal : 0
  const count = Number.isFinite(cartCount) ? cartCount : 0
  const hasItems = items.length > 0

  return (
    <>
      <button
        type="button"
        className={`tag-edge-tab tag-edge-tab--right${isRightSidebarVisible ? " is-hidden" : ""}`}
        aria-label={count > 0 ? `Open cart, ${count} items` : "Open cart"}
        aria-controls={CART_PANEL_ID}
        aria-expanded={isRightSidebarVisible}
        tabIndex={isRightSidebarVisible ? -1 : 0}
        onClick={() => toggleRightSidebar(true)}
      >
        <ShoppingCart aria-hidden="true" />
        {count > 0 ? <span className="tag-count" aria-hidden="true">{count}</span> : null}
        <span className="tag-edge-tab__label" aria-hidden="true">Cart</span>
      </button>

      <aside
        id={CART_PANEL_ID}
        className={`tag-panel tag-panel--right${isRightSidebarVisible ? " is-open" : ""}`}
        aria-label="Your cart"
        inert={!isRightSidebarVisible}
      >
        <div className="tag-panel__head">
          <h2 className="tag-panel__title">
            Your cart
            {hasItems ? <span className="tag-panel__pill">{count} {count === 1 ? "item" : "items"}</span> : null}
          </h2>
          <button type="button" className="tag-panel__close" aria-label="Close your cart" onClick={() => toggleRightSidebar(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="tag-panel__body">
          {hasItems ? (
            <ul className="tag-cart__list">
              {items.map((item, index) => (
                <CartItem
                  key={item.listingId || item.id || `cart-item-${index}`}
                  item={item}
                  updateQuantity={updateQuantity}
                  removeFromCart={removeFromCart}
                  onNavigate={() => toggleRightSidebar(false)}
                />
              ))}
            </ul>
          ) : (
            <div className="tag-cart__empty">
              <span className="tag-cart__empty-icon" aria-hidden="true">
                <ShoppingCart />
              </span>
              <h3>Your cart is empty</h3>
              <p>Find something you love from Guild artists.</p>
              <Link href="/art/" className="btn btn-primary btn-sm" onClick={() => toggleRightSidebar(false)}>
                Browse art
              </Link>
            </div>
          )}
        </div>

        {hasItems ? (
          <div className="tag-panel__foot">
            <div className="tag-cart__sum">
              <span>Subtotal</span>
              <span>{formatMoney(total)}</span>
            </div>
            <div className="tag-cart__sum tag-cart__sum--total">
              <span>Total</span>
              <b>{formatMoney(total)}</b>
            </div>
            <Link href="/checkout" className="btn btn-primary tag-cart__checkout" onClick={() => toggleRightSidebar(false)}>
              Proceed to checkout
            </Link>
            <small className="tag-cart__note">Shipping and taxes calculated at checkout.</small>
          </div>
        ) : null}
      </aside>
    </>
  )
}
