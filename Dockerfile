FROM php:8.3-apache

RUN apt-get update && apt-get install -y \
    mariadb-client \
    git \
    unzip \
    libonig-dev \
    libzip-dev \
    libicu-dev \
    default-libmysqlclient-dev \
    zip \
    vim \
    curl \
    rsync \
    && docker-php-ext-install \
        pdo \
        pdo_mysql \
        mbstring \
        zip \
        opcache \
        intl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Node.js LTS
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Xdebug
RUN pecl install xdebug \
    && docker-php-ext-enable xdebug

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Apache
RUN a2enmod rewrite
COPY docker/apache/vhost.conf /etc/apache2/sites-available/000-default.conf

# PHP config
COPY docker/php/xdebug.ini /usr/local/etc/php/conf.d/docker-xdebug.ini
COPY docker/php/php.ini    /usr/local/etc/php/conf.d/docker-php.ini

WORKDIR /var/www/html
