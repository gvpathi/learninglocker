import React from 'react';
import withStyles from 'isomorphic-style-loader/lib/withStyles';
import VisualiseIcon from 'ui/components/VisualiseIcon';
import styles from './styles.css';

const Card = ({ title, type, onSelect }) => (
  <div
    className={styles.card}
    onClick={() => onSelect()}>
    <div className={styles.cardImg} >
      <VisualiseIcon type={type} />
    </div>

    <p>{title}</p>
  </div>
);

export default withStyles(styles)(Card);
