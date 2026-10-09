// Shared hero for the main tabs: a rounded banner with the tab's photo from public/images/heroes (all hero images live there).
// `tone` is the colour of the text: 'dark' = white text on a dark photo, 'light' = dark text on a light photo.
import type { CSSProperties, ReactNode } from 'react'
import styles from './PageHero.module.css'

interface Props {
  image: string
  tone: 'dark' | 'light'
  title: ReactNode
  kicker?: string
  badge?: string
  subtitle?: ReactNode
  /** Frame width in px. Default 1120. */
  width?: number
  /** false = fill the parent container instead of centring itself on the page. */
  framed?: boolean
  /** Space below the hero in px (for pages whose next block overlaps upwards). */
  gap?: number
  /** Taller banner with more space between the lines. */
  tall?: boolean
  /** Overrides the kicker colour. */
  kickerColor?: string
  /** Heading font size (any CSS size); defaults to the page-hero size. */
  titleSize?: string
  children?: ReactNode
}

export default function PageHero({ image, tone, title, kicker, badge, subtitle, width = 1120, framed = true, gap = 0, tall = false, kickerColor, titleSize, children }: Props) {
  const style = { '--hero-img': `url(${image})`, '--hero-w': `${width}px`, marginBottom: gap, ...(titleSize ? { '--hero-title-size': titleSize } : {}) } as CSSProperties
  return <div className={framed ? styles.frame : styles.fill} style={style}>
    <section className={`${styles.hero} ${tone === 'dark' ? styles.dark : styles.light} ${tall ? styles.tall : ''}`}>
      <div className={styles.inner}>
        {badge && <span className={styles.badge}>{badge}</span>}
        {kicker && <span className={styles.kicker} style={kickerColor ? { color: kickerColor } : undefined}>{kicker}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        {children}
      </div>
    </section>
  </div>
}
