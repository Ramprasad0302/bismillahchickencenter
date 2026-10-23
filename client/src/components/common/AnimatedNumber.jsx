import { useEffect, useRef, useState } from 'react';
import { animate, useInView } from 'framer-motion';

// Counts up to `value` when it scrolls into view. `format` turns the running
// number into display text (currency, kg, ...).
const AnimatedNumber = ({ value = 0, format = (n) => Math.round(n).toLocaleString('en-IN'), duration = 1.2 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(() => format(0));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, Number(value) || 0, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(format(v)),
    });
    return () => controls.stop();
    // format is usually an inline function; re-running on value is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, duration]);

  return <span ref={ref}>{display}</span>;
};

export default AnimatedNumber;
