#!/bin/sh
# kFreeBSD do not accept scripts as interpreters, using #!/bin/sh and sourcing.
if [ true != "$INIT_D_SCRIPT_SOURCED" ] ; then
    set "$0" "$@"; INIT_D_SCRIPT_SOURCED=true . /lib/init/init-d-script
fi
### BEGIN INIT INFO
# Provides:             baby-connect-sqs-listener
# Required-Start:       $remote_fs $syslog
# Required-Stop:        $remote_fs $syslog
# Default-Start:        2 3 4 5
# Default-Stop:         0 1 6
# Short-Description:    Baby Connect SQS message queue listener
# Description:          A Node.js listener that reads messages from an AWS SQS
#                       message queue and uses them to load data into the Baby
#                       Connect service.
### END INIT INFO

# Author: Adam Platt <adam@plattsoft.net>

do_start () {
    # Start Xvfb
    Xvfb -ac -screen scrn 1280x1024x24 :9.0 &

    # Start listener
    (cd /usr/local/baby-connect-sqs-listener && DISPLAY=:9.0 /usr/local/bin/node index &)
 
    # Record listener PID
    echo $! > /tmp/.baby-connect-sqs-listener
}

do_stop () {
    # Stop listener
    if [ -f /tmp/.baby-connect-sqs-listener ] ; then
        kill -9 `cat /tmp/.baby-connect-sqs-listener`
        rm -f /tmp/.baby-connect-sqs-listener
    fi
    
    # Stop xvfb
    if [ -f /tmp/.X9-lock ] ; then
        kill -9 `cat /tmp/.X9-lock`
        rm -f /tmp/.X9-lock
    fi
}

do_status () {
    # Check xvfb and listener
    if [ -f /tmp/.baby-connect-sqs-listener -a -f /tmp/.X9-lock ] ; then
        return 4
    else
        return 0
    fi
}

case "$1" in
    start|"")
        do_start
        ;;
    restart)
        do_stop
        do_start
        ;;
    stop)
        do_stop
        ;;
    status)
        do_status
        exit $?
        ;;
    *)
        echo "Usage: baby-connect-sqs-listener [start|stop|restart|status]" >&2
        exit 3
        ;;
esac

exit 0
