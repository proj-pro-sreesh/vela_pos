import React from 'react';
import { Box, Typography } from '@mui/material';

const Dashboard = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome to Vela POS
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Use the menu to navigate to different sections of the POS system.
      </Typography>
    </Box>
  );
};

export default Dashboard;
