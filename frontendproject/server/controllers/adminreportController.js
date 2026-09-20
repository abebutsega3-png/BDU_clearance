exports.getAdminReports = async (req, res) => {
  try {
    const { reportType, startDate, endDate, campus, department } = req.query;

    res.status(200).json({
      success: true,
      summary: {
        totalRequests: 892,
        pendingRequests: 135,
        inProgressRequests: 45,
        completedClearances: 684,
        rejectedRequests: 28
      },
      monthlyTrend: [
        { month: 'Jan', total: 130, completed: 75, pending: 20, rejected: 5 },
        { month: 'Feb', total: 165, completed: 110, pending: 20, rejected: 5 },
        { month: 'Mar', total: 210, completed: 130, pending: 35, rejected: 10 },
        { month: 'Apr', total: 155, completed: 80, pending: 22, rejected: 6 },
        { month: 'May', total: 160, completed: 88, pending: 25, rejected: 7 },
        { month: 'Jun', total: 152, completed: 75, pending: 18, rejected: 5 },
        { month: 'Jul', total: 190, completed: 102, pending: 28, rejected: 5 },
        { month: 'Aug', total: 162, completed: 82, pending: 20, rejected: 4 },
        { month: 'Sep', total: 170, completed: 90, pending: 25, rejected: 7 },
        { month: 'Oct', total: 125, completed: 64, pending: 18, rejected: 3 },
        { month: 'Nov', total: 122, completed: 63, pending: 17, rejected: 3 },
        { month: 'Dec', total: 163, completed: 86, pending: 22, rejected: 5 }
      ],
      campusBreakdown: [
        { name: 'Main Campus', count: 590, percent: '66.1%' },
        { name: 'Woreta Campus', count: 152, percent: '17.0%' },
        { name: 'Medical Campus', count: 95, percent: '10.7%' },
        { name: 'Tibebe Ghion Campus', count: 55, percent: '6.2%' }
      ],
      recentRequests: [
        { id: 1, name: 'Abebe Kebede', empId: 'BDU-EMP-02345', dept: 'Finance', date: 'May 24, 2025', status: 'Pending' },
        { id: 2, name: 'Hana Tesfaye', empId: 'BDU-EMP-01876', dept: 'Human Resources', date: 'May 24, 2025', status: 'In Progress' },
        { id: 3, name: 'Kebede Bekele', empId: 'BDU-EMP-01023', dept: 'ICT', date: 'May 24, 2025', status: 'Completed' },
        { id: 4, name: 'Meseret Alemu', empId: 'BDU-EMP-00789', dept: 'Student Affairs', date: 'May 23, 2025', status: 'Rejected' },
        { id: 5, name: 'Tekle Abera', empId: 'BDU-EMP-01234', dept: 'Administration', date: 'May 23, 2025', status: 'Pending' }
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};